import z from "zod";

export const initiatePurchaseSchema = z.object({
  ideaId: z.string().min(1, "Idea ID is required"),
});
