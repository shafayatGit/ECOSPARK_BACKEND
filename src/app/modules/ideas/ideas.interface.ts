import { IdeaStatus } from "../../../generated/prisma/enums";

export interface ICreateIdea {
  title: string;
  problemStatement: string;
  proposedSolution: string;
  description?: string;
  categoryId: string;
  isPaid?: boolean;
  price?: number;
  imageUrls?: string[];
}

export interface IUpdateIdea {
  title?: string;
  problemStatement?: string;
  proposedSolution?: string;
  description?: string;
  categoryId?: string;
  isPaid?: boolean;
  price?: number;
  imageUrls?: string[];
}

export const EDITABLE_IDEA_STATUSES: IdeaStatus[] = [
  IdeaStatus.DRAFT,
  IdeaStatus.REJECTED,
];

export const IDEA_STATUS_TRANSITIONS: Record<
  IdeaStatus,
  Partial<Record<IdeaStatus, { actor: "owner" | "admin"; label: string }>>
> = {
  [IdeaStatus.DRAFT]: {
    [IdeaStatus.PENDING]: { actor: "owner", label: "submit" },
  },
  [IdeaStatus.PENDING]: {
    [IdeaStatus.UNDER_REVIEW]: { actor: "admin", label: "start review" },
  },
  [IdeaStatus.UNDER_REVIEW]: {
    [IdeaStatus.APPROVED]: { actor: "admin", label: "approve" },
    [IdeaStatus.REJECTED]: { actor: "admin", label: "reject" },
  },
  [IdeaStatus.APPROVED]: {},
  [IdeaStatus.REJECTED]: {
    [IdeaStatus.PENDING]: { actor: "owner", label: "resubmit" },
  },
};
