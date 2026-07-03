import status from "http-status";
import { IdeaStatus } from "../../../generated/prisma/enums";
import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { executeListQuery } from "../../utils/queryHelper";
import { IDEA_STATUS_TRANSITIONS } from "../ideas/ideas.interface";

const ideaInclude = {
  author: {
    select: { id: true, name: true, email: true, image: true },
  },
  category: {
    select: { id: true, name: true, slug: true },
  },
  _count: { select: { comments: true, votes: true } },
} as const;

const getIdeaOrThrow = async (ideaId: string) => {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    include: ideaInclude,
  });

  if (!idea) {
    throw new AppError(status.NOT_FOUND, "Idea not found");
  }

  return idea;
};

const assertAdminTransition = (
  currentStatus: IdeaStatus,
  nextStatus: IdeaStatus,
) => {
  const transition = IDEA_STATUS_TRANSITIONS[currentStatus]?.[nextStatus];

  if (!transition || transition.actor !== "admin") {
    throw new AppError(
      status.BAD_REQUEST,
      `Cannot transition idea from ${currentStatus} to ${nextStatus}`,
    );
  }
};

/**
 * Admin retrieves review queue of ideas
 * Admins have unrestricted access to all idea content regardless of payment status
 * Can filter by status (defaults to PENDING if not specified)
 */
const getReviewQueue = async (query: Record<string, unknown> = {}) => {
  const queryCopy = { ...query };
  let where: Record<string, unknown> = {};

  if (!query.status) {
    where = { status: IdeaStatus.PENDING };
  } else if (query.status === "ALL") {
    delete queryCopy.status;
  }

  return executeListQuery({
    model: prisma.idea,
    query: queryCopy,
    config: {
      searchableFields: ["title", "problemStatement", "proposedSolution"],
      filterableFields: ["status", "isPaid", "categoryId", "authorId"],
    },
    where,
    include: ideaInclude,
    defaultSort: { sortBy: "createdAt", sortOrder: "asc" },
  });
};

const startReview = async (ideaId: string) => {
  const idea = await getIdeaOrThrow(ideaId);
  assertAdminTransition(idea.status, IdeaStatus.UNDER_REVIEW);

  return prisma.idea.update({
    where: { id: ideaId },
    data: { status: IdeaStatus.UNDER_REVIEW },
    include: ideaInclude,
  });
};

const approveIdea = async (ideaId: string) => {
  const idea = await getIdeaOrThrow(ideaId);
  assertAdminTransition(idea.status, IdeaStatus.APPROVED);

  return prisma.idea.update({
    where: { id: ideaId },
    data: {
      status: IdeaStatus.APPROVED,
      publishedAt: new Date(),
      rejectionFeedback: null,
    },
    include: ideaInclude,
  });
};

const rejectIdea = async (ideaId: string, rejectionFeedback: string) => {
  const idea = await getIdeaOrThrow(ideaId);
  assertAdminTransition(idea.status, IdeaStatus.REJECTED);

  return prisma.idea.update({
    where: { id: ideaId },
    data: {
      status: IdeaStatus.REJECTED,
      rejectionFeedback,
    },
    include: ideaInclude,
  });
};

export const AdminIdeaServices = {
  getReviewQueue,
  startReview,
  approveIdea,
  rejectIdea,
};
