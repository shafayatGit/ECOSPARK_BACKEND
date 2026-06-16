import { VoteType } from "../../../generated/prisma/enums";

export interface ICastVote {
  ideaId: string;
  type: VoteType;
}
