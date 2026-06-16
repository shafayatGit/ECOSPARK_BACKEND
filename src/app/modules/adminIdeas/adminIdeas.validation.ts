import z from "zod";
import { adminIdeaListQuerySchema } from "../../validations/listQuery.validation";

export const rejectIdeaSchema = z.object({
  rejectionFeedback: z
    .string()
    .min(10, "Rejection feedback must be at least 10 characters"),
});

export const adminIdeasQuerySchema = adminIdeaListQuerySchema;
