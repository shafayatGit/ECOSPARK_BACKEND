import z from "zod";
import { VoteType } from "../../../generated/prisma/enums";

export const castVoteSchema = z.object({
  ideaId: z.string().min(1, "Idea ID is required"),
  type: z.enum([VoteType.UPVOTE, VoteType.DOWNVOTE]),
});
