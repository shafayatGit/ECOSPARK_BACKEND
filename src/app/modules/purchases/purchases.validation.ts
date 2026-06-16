import z from "zod";

export const initiatePurchaseSchema = z.object({
  ideaId: z.string().min(1, "Idea ID is required"),
});

export const webhookPayloadSchema = z.object({
  transactionId: z.string().min(1),
  status: z.enum(["COMPLETED", "FAILED"]),
  signature: z.string().optional(),
});
