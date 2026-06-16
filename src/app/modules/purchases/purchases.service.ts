import crypto from "crypto";
import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import { IdeaStatus, PaymentStatus } from "../../../generated/prisma/enums";
import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { executeListQuery } from "../../utils/queryHelper";
import { IInitiatePurchase, IWebhookPayload } from "./purchases.interface";

const generateTransactionId = () =>
  `txn_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;

const verifyWebhookSignature = (
  transactionId: string,
  signature?: string,
): boolean => {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  if (!signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(transactionId)
    .digest("hex");

  if (signature.length !== expected.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected),
  );
};

const initiatePurchase = async (
  payload: IInitiatePurchase,
  userId: string,
) => {
  const idea = await prisma.idea.findUnique({
    where: { id: payload.ideaId },
    select: {
      id: true,
      title: true,
      isPaid: true,
      price: true,
      status: true,
      authorId: true,
    },
  });

  if (!idea) {
    throw new AppError(status.NOT_FOUND, "Idea not found");
  }

  if (idea.status !== IdeaStatus.APPROVED) {
    throw new AppError(
      status.BAD_REQUEST,
      "Only approved ideas can be purchased",
    );
  }

  if (!idea.isPaid || !idea.price) {
    throw new AppError(status.BAD_REQUEST, "This idea is not a paid idea");
  }

  if (idea.authorId === userId) {
    throw new AppError(
      status.BAD_REQUEST,
      "You cannot purchase your own idea",
    );
  }

  const existingPurchase = await prisma.ideaPurchase.findFirst({
    where: {
      userId,
      ideaId: idea.id,
      paymentStatus: PaymentStatus.COMPLETED,
    },
  });

  if (existingPurchase) {
    throw new AppError(
      status.CONFLICT,
      "You have already purchased this idea",
    );
  }

  const transactionId = generateTransactionId();
  const amountPaid = new Prisma.Decimal(idea.price);

  const purchase = await prisma.ideaPurchase.create({
    data: {
      userId,
      ideaId: idea.id,
      transactionId,
      amountPaid,
      gateway: "stripe",
      paymentStatus: PaymentStatus.PENDING,
    },
  });

  return {
    purchase,
    checkoutUrl: `/api/purchases/checkout/${transactionId}`,
    message:
      "Payment initiated. Access will be granted after webhook confirmation.",
  };
};

const handleWebhook = async (payload: IWebhookPayload) => {
  if (!verifyWebhookSignature(payload.transactionId, payload.signature)) {
    throw new AppError(status.FORBIDDEN, "Invalid webhook signature");
  }

  const purchase = await prisma.ideaPurchase.findUnique({
    where: { transactionId: payload.transactionId },
  });

  if (!purchase) {
    throw new AppError(status.NOT_FOUND, "Purchase record not found");
  }

  if (purchase.paymentStatus === PaymentStatus.COMPLETED) {
    return purchase;
  }

  if (payload.status === "FAILED") {
    return prisma.ideaPurchase.update({
      where: { id: purchase.id },
      data: { paymentStatus: PaymentStatus.PENDING },
    });
  }

  return prisma.ideaPurchase.update({
    where: { id: purchase.id },
    data: {
      paymentStatus: PaymentStatus.COMPLETED,
      completedAt: new Date(),
    },
  });
};

const purchaseListInclude = {
  idea: {
    select: {
      id: true,
      title: true,
      isPaid: true,
      price: true,
      imageUrls: true,
      author: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, slug: true } },
    },
  },
} as const;

const getMyPurchases = async (
  userId: string,
  query: Record<string, unknown> = {},
) => {
  return executeListQuery({
    model: prisma.ideaPurchase,
    query,
    config: {
      searchableFields: ["transactionId", "gateway", "idea.title"],
      filterableFields: ["paymentStatus", "gateway", "ideaId"],
    },
    where: {
      userId,
      paymentStatus: PaymentStatus.COMPLETED,
    },
    include: purchaseListInclude,
    defaultSort: { sortBy: "completedAt", sortOrder: "desc" },
  });
};

export const PurchaseServices = {
  initiatePurchase,
  handleWebhook,
  getMyPurchases,
};
