import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import {
  IdeaStatus,
  PaymentStatus,
  UserRole,
} from "../../../generated/prisma/enums";
import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { IUserJwtPayload } from "../../interfaces/user.interface";
import { executeListQuery } from "../../utils/queryHelper";
import {
  EDITABLE_IDEA_STATUSES,
  ICreateIdea,
  IUpdateIdea,
} from "./ideas.interface";

const ideaAuthorSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
} as const;

const ideaCategorySelect = {
  id: true,
  name: true,
  slug: true,
} as const;

const validatePaidFields = (isPaid?: boolean, price?: number) => {
  if (isPaid && (price === undefined || price <= 0)) {
    throw new AppError(
      status.BAD_REQUEST,
      "Price is required and must be greater than 0 for paid ideas",
    );
  }
};

const ensureCategoryExists = async (categoryId: string) => {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw new AppError(status.NOT_FOUND, "Category not found");
  }
};

const getIdeaOrThrow = async (ideaId: string) => {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    include: {
      author: { select: ideaAuthorSelect },
      category: { select: ideaCategorySelect },
    },
  });

  if (!idea) {
    throw new AppError(status.NOT_FOUND, "Idea not found");
  }

  return idea;
};

/**
 * Check if a user has full access to an idea's paid content
 * Access is granted to:
 * - Anyone if the idea is free (isPaid = false)
 * - Admins (unrestricted access to all ideas)
 * - The idea author (can always access their own ideas)
 * - Users who have completed a payment for the idea
 */
const hasFullAccess = async (
  idea: { id: string; isPaid: boolean; authorId: string },
  user?: IUserJwtPayload,
): Promise<boolean> => {
  // Free ideas are accessible to everyone
  if (!idea.isPaid) return true;

  // No user logged in cannot access paid content
  if (!user) return false;

  // Admins have unrestricted access to all ideas
  if (user.role === UserRole.ADMIN) return true;

  // Authors have full access to their own ideas
  if (user.userId === idea.authorId) return true;

  // Check if user has completed payment for this idea
  const purchase = await prisma.ideaPurchase.findFirst({
    where: {
      userId: user.userId,
      ideaId: idea.id,
      paymentStatus: PaymentStatus.COMPLETED,
    },
  });

  return Boolean(purchase);
};

/**
 * Returns idea with content masked based on user's access level
 * Includes hasFullAccess property for frontend to determine what to display
 * Paid content (proposedSolution, description) is only visible if access is granted
 */
const getIdeaForUser = async (
  idea: {
    id: string;
    isPaid: boolean;
    authorId: string;
    [key: string]: unknown;
  },
  user?: IUserJwtPayload,
) => {
  // For free ideas, always grant access
  if (!idea.isPaid) {
    return {
      ...idea,
      hasFullAccess: true,
    };
  }

  // Check user's access level for paid ideas
  const accessGranted = await hasFullAccess(idea, user);

  // Return idea with access status flag and masked/unmasked content
  return accessGranted
    ? {
        ...idea,
        hasFullAccess: true,
      }
    : {
        ...maskPaidContent(idea),
        hasFullAccess: false,
      };
};

/**
 * Mask paid content fields for users without access
 * Hides proposedSolution and description from unauthorized users
 */
const maskPaidContent = <T extends Record<string, unknown>>(idea: T) => {
  return {
    ...idea,
    proposedSolution: null,
    description: null,
  };
};

const createIdea = async (payload: ICreateIdea, authorId: string) => {
  validatePaidFields(payload.isPaid, payload.price);
  await ensureCategoryExists(payload.categoryId);

  return prisma.idea.create({
    data: {
      title: payload.title,
      problemStatement: payload.problemStatement,
      proposedSolution: payload.proposedSolution,
      description: payload.description,
      categoryId: payload.categoryId,
      authorId,
      status: IdeaStatus.DRAFT,
      isPaid: payload.isPaid ?? false,
      price:
        payload.isPaid && payload.price !== undefined
          ? new Prisma.Decimal(payload.price)
          : null,
      imageUrls: payload.imageUrls ?? [],
    },
    include: {
      author: { select: ideaAuthorSelect },
      category: { select: ideaCategorySelect },
    },
  });
};

const ideaListInclude = {
  author: { select: ideaAuthorSelect },
  category: { select: ideaCategorySelect },
  _count: { select: { comments: true, votes: true } },
} as const;

/**
 * Build where clause for approved ideas query
 * Filters for approved ideas and optionally by category
 */
const buildApprovedIdeasWhere = (
  query: Record<string, unknown>,
): Record<string, unknown> => {
  const where: Record<string, unknown> = {
    status: IdeaStatus.APPROVED,
  };

  const category = query.category as string | undefined;

  if (category) {
    where.category = {
      OR: [{ slug: category }, { id: category }],
    };
  }

  return where;
};

/**
 * Retrieve approved ideas with content masking based on user access
 * Users see full content only if:
 * - They have admin role
 * - They are the idea author
 * - They have completed payment for a paid idea
 * Otherwise, paid content is masked
 */
const getApprovedIdeas = async (
  query: Record<string, unknown> = {},
  user?: IUserJwtPayload,
) => {
  const result = await executeListQuery({
    model: prisma.idea,
    query,
    config: {
      searchableFields: ["title", "description", "problemStatement"],
      filterableFields: ["isPaid", "categoryId"],
    },
    where: buildApprovedIdeasWhere(query),
    include: ideaListInclude,
    defaultSort: { sortBy: "createdAt", sortOrder: "desc" },
  });

  // Apply user-specific access control to each idea
  const data = await Promise.all(
    (
      result.data as Array<{
        id: string;
        isPaid: boolean;
        authorId: string;
        [key: string]: unknown;
      }>
    ).map((idea) => getIdeaForUser(idea, user)),
  );

  return { ...result, data };
};

/**
 * Retrieve a single idea by ID with proper access control
 * Approved ideas: accessible to everyone (with content masking for unauthorized paid ideas)
 * Non-approved ideas: only accessible to author or admin
 */
const getIdeaById = async (ideaId: string, user?: IUserJwtPayload) => {
  const idea = await getIdeaOrThrow(ideaId);

  const isOwner = user?.userId === idea.authorId;
  const isAdmin = user?.role === UserRole.ADMIN;

  // Only approved ideas are visible to non-owners/non-admins
  if (idea.status !== IdeaStatus.APPROVED && !isOwner && !isAdmin) {
    throw new AppError(status.NOT_FOUND, "Idea not found");
  }

  // Apply user-specific content masking for paid ideas
  return getIdeaForUser(idea, user);
};

const getMyIdeas = async (
  authorId: string,
  query: Record<string, unknown> = {},
) => {
  return executeListQuery({
    model: prisma.idea,
    query,
    config: {
      searchableFields: ["title", "description", "problemStatement"],
      filterableFields: ["status", "isPaid", "categoryId"],
    },
    where: { authorId },
    include: {
      category: { select: ideaCategorySelect },
      _count: { select: { comments: true, votes: true } },
    },
    defaultSort: { sortBy: "updatedAt", sortOrder: "desc" },
  });
};

const updateIdea = async (
  ideaId: string,
  payload: IUpdateIdea,
  userId: string,
) => {
  const idea = await getIdeaOrThrow(ideaId);

  if (idea.authorId !== userId) {
    throw new AppError(status.FORBIDDEN, "You can only edit your own ideas");
  }

  if (!EDITABLE_IDEA_STATUSES.includes(idea.status)) {
    throw new AppError(
      status.BAD_REQUEST,
      `Cannot edit idea with status ${idea.status}`,
    );
  }

  const nextIsPaid = payload.isPaid ?? idea.isPaid;
  const nextPrice =
    payload.price !== undefined ? payload.price : Number(idea.price ?? 0);

  validatePaidFields(nextIsPaid, nextIsPaid ? nextPrice : undefined);

  if (payload.categoryId) {
    await ensureCategoryExists(payload.categoryId);
  }

  return prisma.idea.update({
    where: { id: ideaId },
    data: {
      title: payload.title,
      problemStatement: payload.problemStatement,
      proposedSolution: payload.proposedSolution,
      description: payload.description,
      categoryId: payload.categoryId,
      isPaid: payload.isPaid,
      price:
        nextIsPaid && (payload.price !== undefined || idea.price)
          ? new Prisma.Decimal(nextPrice)
          : payload.isPaid === false
            ? null
            : undefined,
      imageUrls: payload.imageUrls,
      rejectionFeedback: idea.status === IdeaStatus.REJECTED ? null : undefined,
    },
    include: {
      author: { select: ideaAuthorSelect },
      category: { select: ideaCategorySelect },
    },
  });
};

const submitIdeaForReview = async (ideaId: string, userId: string) => {
  const idea = await prisma.idea.findUnique({ where: { id: ideaId } });

  if (!idea) {
    throw new AppError(status.NOT_FOUND, "Idea not found");
  }

  if (idea.authorId !== userId) {
    throw new AppError(status.FORBIDDEN, "You can only submit your own ideas");
  }

  const allowedFrom: IdeaStatus[] = [IdeaStatus.DRAFT, IdeaStatus.REJECTED];

  if (!allowedFrom.includes(idea.status)) {
    throw new AppError(
      status.BAD_REQUEST,
      `Cannot submit idea with status ${idea.status}`,
    );
  }

  return prisma.idea.update({
    where: { id: ideaId },
    data: {
      status: IdeaStatus.PENDING,
      rejectionFeedback: null,
    },
    include: {
      author: { select: ideaAuthorSelect },
      category: { select: ideaCategorySelect },
    },
  });
};

const deleteIdea = async (ideaId: string, userId: string, role: UserRole) => {
  const idea = await prisma.idea.findUnique({ where: { id: ideaId } });

  if (!idea) {
    throw new AppError(status.NOT_FOUND, "Idea not found");
  }

  if (idea.authorId !== userId && role !== UserRole.ADMIN) {
    throw new AppError(status.FORBIDDEN, "Not authorized to delete this idea");
  }

  if (idea.status === IdeaStatus.APPROVED && role !== UserRole.ADMIN) {
    throw new AppError(
      status.BAD_REQUEST,
      "Approved ideas cannot be deleted by the owner",
    );
  }

  await prisma.idea.delete({ where: { id: ideaId } });
  return { id: ideaId };
};

export const IdeaServices = {
  createIdea,
  getApprovedIdeas,
  getIdeaById,
  getMyIdeas,
  updateIdea,
  submitIdeaForReview,
  deleteIdea,
  hasFullAccess,
};
