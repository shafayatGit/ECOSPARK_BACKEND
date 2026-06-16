import status from "http-status";
import { IdeaStatus, VoteType } from "../../../generated/prisma/enums";
import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { ICastVote } from "./votes.interface";

const ensureApprovedIdea = async (ideaId: string) => {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: { id: true, status: true, authorId: true },
  });

  if (!idea) {
    throw new AppError(status.NOT_FOUND, "Idea not found");
  }

  if (idea.status !== IdeaStatus.APPROVED) {
    throw new AppError(
      status.BAD_REQUEST,
      "Votes can only be cast on approved ideas",
    );
  }

  return idea;
};

const castVote = async (payload: ICastVote, userId: string) => {
  const idea = await ensureApprovedIdea(payload.ideaId);

  if (idea.authorId === userId) {
    throw new AppError(status.BAD_REQUEST, "You cannot vote on your own idea");
  }

  const existingVote = await prisma.vote.findUnique({
    where: {
      userId_ideaId: { userId, ideaId: payload.ideaId },
    },
  });

  if (!existingVote) {
    return prisma.$transaction(async (tx) => {
      const vote = await tx.vote.create({
        data: {
          userId,
          ideaId: payload.ideaId,
          type: payload.type,
        },
      });

      await tx.idea.update({
        where: { id: payload.ideaId },
        data:
          payload.type === VoteType.UPVOTE
            ? { upvoteCount: { increment: 1 } }
            : { downvoteCount: { increment: 1 } },
      });

      return vote;
    });
  }

  if (existingVote.type === payload.type) {
    throw new AppError(
      status.CONFLICT,
      `You have already cast a ${payload.type.toLowerCase()} on this idea`,
    );
  }

  return prisma.$transaction(async (tx) => {
    const vote = await tx.vote.update({
      where: { id: existingVote.id },
      data: { type: payload.type },
    });

    if (payload.type === VoteType.UPVOTE) {
      await tx.idea.update({
        where: { id: payload.ideaId },
        data: {
          upvoteCount: { increment: 1 },
          downvoteCount: { decrement: 1 },
        },
      });
    } else {
      await tx.idea.update({
        where: { id: payload.ideaId },
        data: {
          upvoteCount: { decrement: 1 },
          downvoteCount: { increment: 1 },
        },
      });
    }

    return vote;
  });
};

const removeVote = async (ideaId: string, userId: string) => {
  await ensureApprovedIdea(ideaId);

  const existingVote = await prisma.vote.findUnique({
    where: {
      userId_ideaId: { userId, ideaId },
    },
  });

  if (!existingVote) {
    throw new AppError(status.NOT_FOUND, "Vote not found");
  }

  return prisma.$transaction(async (tx) => {
    await tx.vote.delete({ where: { id: existingVote.id } });

    await tx.idea.update({
      where: { id: ideaId },
      data:
        existingVote.type === VoteType.UPVOTE
          ? { upvoteCount: { decrement: 1 } }
          : { downvoteCount: { decrement: 1 } },
    });

    return { ideaId, removed: true };
  });
};

const getMyVoteForIdea = async (ideaId: string, userId: string) => {
  const vote = await prisma.vote.findUnique({
    where: {
      userId_ideaId: { userId, ideaId },
    },
  });

  return vote;
};

export const VoteServices = {
  castVote,
  removeVote,
  getMyVoteForIdea,
};
