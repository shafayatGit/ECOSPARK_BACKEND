export interface ICreateComment {
  content: string;
  ideaId: string;
  parentId?: string;
}

export interface ICommentNode {
  id: string;
  content: string;
  authorId: string;
  ideaId: string;
  parentId: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    name: string;
    image: string | null;
  };
  replies: ICommentNode[];
}
