import z from "zod";
import { commentListQuerySchema } from "../../validations/listQuery.validation";

export const createCommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(5000),
  ideaId: z.string().min(1, "Idea ID is required"),
  parentId: z.string().optional(),
});

export const getCommentsQuerySchema = commentListQuerySchema;
