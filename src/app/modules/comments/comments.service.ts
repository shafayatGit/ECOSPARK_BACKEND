import status from "http-status";
import { IdeaStatus, UserRole } from "../../../generated/prisma/enums";
import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { executeListQuery } from "../../utils/queryHelper";
import { ICommentNode, ICreateComment } from "./comments.interface";

const authorSelect = {
  id: true,
  name: true,
  image: true,
} as const;

const buildCommentTree = (
  comments: Array<{
    id: string;
    content: string;
    authorId: string;
    ideaId: string;
    parentId: string | null;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    author: { id: string; name: string; image: string | null };
  }>,
): ICommentNode[] => {
  const map = new Map<string, ICommentNode>();
  const roots: ICommentNode[] = [];

  for (const comment of comments) {
    map.set(comment.id, {
      ...comment,
      content: comment.isDeleted ? "[comment removed]" : comment.content,
      replies: [],
    });
  }

  for (const comment of comments) {
    const node = map.get(comment.id)!;

    if (comment.parentId && map.has(comment.parentId)) {
      map.get(comment.parentId)!.replies.push(node);
    } else if (!comment.parentId) {
      roots.push(node);
    }
  }

  return roots;
};

const ensureCommentableIdea = async (ideaId: string) => {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: { id: true, status: true },
  });

  if (!idea) {
    throw new AppError(status.NOT_FOUND, "Idea not found");
  }

  if (idea.status !== IdeaStatus.APPROVED) {
    throw new AppError(
      status.BAD_REQUEST,
      "Comments are only allowed on approved ideas",
    );
  }

  return idea;
};

const createComment = async (payload: ICreateComment, authorId: string) => {
  await ensureCommentableIdea(payload.ideaId);

  if (payload.parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: payload.parentId },
      select: { id: true, ideaId: true, isDeleted: true },
    });

    if (!parent || parent.ideaId !== payload.ideaId) {
      throw new AppError(
        status.BAD_REQUEST,
        "Parent comment not found on this idea",
      );
    }

    if (parent.isDeleted) {
      throw new AppError(
        status.BAD_REQUEST,
        "Cannot reply to a deleted comment",
      );
    }
  }

  return prisma.comment.create({
    data: {
      content: payload.content,
      ideaId: payload.ideaId,
      authorId,
      parentId: payload.parentId ?? null,
    },
    include: {
      author: { select: authorSelect },
    },
  });
};

const getCommentsByIdea = async (
  ideaId: string,
  query: Record<string, unknown> = {},
) => {
  await ensureCommentableIdea(ideaId);

  const result = await executeListQuery({
    model: prisma.comment,
    query,
    config: {
      searchableFields: ["content"],
      filterableFields: ["isDeleted", "authorId", "parentId"],
    },
    where: { ideaId },
    include: {
      author: { select: authorSelect },
    },
    defaultSort: { sortBy: "createdAt", sortOrder: "asc" },
  });

  return {
    ...result,
    data: buildCommentTree(
      result.data as Array<{
        id: string;
        content: string;
        authorId: string;
        ideaId: string;
        parentId: string | null;
        isDeleted: boolean;
        createdAt: Date;
        updatedAt: Date;
        author: { id: string; name: string; image: string | null };
      }>,
    ),
  };
};

const deleteComment = async (
  commentId: string,
  userId: string,
  role: UserRole,
) => {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, authorId: true, isDeleted: true },
  });

  if (!comment) {
    throw new AppError(status.NOT_FOUND, "Comment not found");
  }

  if (comment.isDeleted) {
    throw new AppError(status.BAD_REQUEST, "Comment is already deleted");
  }

  if (comment.authorId !== userId && role !== UserRole.ADMIN) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only delete your own comments",
    );
  }

  return prisma.comment.update({
    where: { id: commentId },
    data: { isDeleted: true },
    select: { id: true, isDeleted: true },
  });
};

export const CommentServices = {
  createComment,
  getCommentsByIdea,
  deleteComment,
};
