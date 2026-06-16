export interface IInitiatePurchase {
  ideaId: string;
}

export interface IWebhookPayload {
  transactionId: string;
  status: "COMPLETED" | "FAILED";
  signature?: string;
}
