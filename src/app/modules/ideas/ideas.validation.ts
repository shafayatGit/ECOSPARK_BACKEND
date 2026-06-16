import z from "zod";
import { ideaListQuerySchema } from "../../validations/listQuery.validation";

const paidIdeaRefinement = (
  data: { isPaid?: boolean; price?: number },
  ctx: z.RefinementCtx,
) => {
  if (data.isPaid && (data.price === undefined || data.price <= 0)) {
    ctx.addIssue({
      code: "custom",
      message: "Price is required and must be greater than 0 for paid ideas",
      path: ["price"],
    });
  }
  if (!data.isPaid && data.price !== undefined) {
    ctx.addIssue({
      code: "custom",
      message: "Price should not be set for free ideas",
      path: ["price"],
    });
  }
};

export const createIdeaSchema = z
  .object({
    title: z.string().min(5, "Title must be at least 5 characters"),
    problemStatement: z
      .string()
      .min(20, "Problem statement must be at least 20 characters"),
    proposedSolution: z
      .string()
      .min(20, "Proposed solution must be at least 20 characters"),
    description: z.string().optional(),
    categoryId: z.string().min(1, "Category is required"),
    isPaid: z.boolean().optional().default(false),
    price: z.number().positive().optional(),
    imageUrls: z.array(z.string().url()).optional().default([]),
  })
  .superRefine(paidIdeaRefinement);

export const updateIdeaSchema = z
  .object({
    title: z.string().min(5).optional(),
    problemStatement: z.string().min(20).optional(),
    proposedSolution: z.string().min(20).optional(),
    description: z.string().optional(),
    categoryId: z.string().min(1).optional(),
    isPaid: z.boolean().optional(),
    price: z.number().positive().optional(),
    imageUrls: z.array(z.string().url()).optional(),
  })
  .superRefine(paidIdeaRefinement);

export const getIdeasQuerySchema = ideaListQuerySchema;

export const getMyIdeasQuerySchema = ideaListQuerySchema.omit({ category: true });
