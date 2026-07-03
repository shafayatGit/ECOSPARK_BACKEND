import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import { IdeaStatus, PaymentStatus } from "../../../generated/prisma/enums";
import AppError from "../../errors/AppError";
import { envVars } from "../../config/env";
import { stripe } from "../../config/stripe.config";
import { prisma } from "../../lib/prisma";
import { executeListQuery } from "../../utils/queryHelper";
import { IInitiatePurchase } from "./purchases.interface";

const GATEWAY = "stripe";

const ideaPurchaseInclude = {
  idea: {
    select: {
      id: true,
      title: true,
      isPaid: true,
      price: true,
      status: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  },
} as const;

const getPurchaseBySessionOrMetadata = async (session: {
  id: string;
  metadata?: Record<string, string> | null;
}) => {
  const purchaseId = session.metadata?.purchaseId;

  if (purchaseId) {
    const purchase = await prisma.ideaPurchase.findUnique({
      where: { id: purchaseId },
      include: {
        idea: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (purchase) {
      return purchase;
    }
  }

  return prisma.ideaPurchase.findFirst({
    where: { transactionId: session.id },
    include: {
      idea: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

const initiatePurchase = async (payload: IInitiatePurchase, userId: string) => {
  const idea = await prisma.idea.findUnique({
    where: { id: payload.ideaId },
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

  if (!idea.isPaid || idea.price === null) {
    throw new AppError(status.BAD_REQUEST, "This idea is not a paid idea");
  }

  if (idea.authorId === userId) {
    throw new AppError(status.BAD_REQUEST, "You cannot purchase your own idea");
  }

  const existingCompletedPurchase = await prisma.ideaPurchase.findFirst({
    where: {
      userId,
      ideaId: idea.id,
      paymentStatus: PaymentStatus.COMPLETED,
    },
  });

  if (existingCompletedPurchase) {
    throw new AppError(status.CONFLICT, "You have already purchased this idea");
  }

  await prisma.ideaPurchase.updateMany({
    where: {
      userId,
      ideaId: idea.id,
      paymentStatus: PaymentStatus.PENDING,
    },
    data: {
      paymentStatus: PaymentStatus.FAILED,
    },
  });

  const amountPaid = new Prisma.Decimal(idea.price);
  const amountInCents = Math.round(Number(amountPaid) * 100);

  if (amountInCents <= 0) {
    throw new AppError(status.BAD_REQUEST, "Invalid idea price");
  }

  const purchase = await prisma.ideaPurchase.create({
    data: {
      transactionId: `pending-${crypto.randomUUID()}`,
      paymentStatus: PaymentStatus.PENDING,
      amountPaid,
      gateway: GATEWAY,
      userId,
      ideaId: idea.id,
    },
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: idea.title,
            description:
              idea.description?.slice(0, 250) ||
              idea.problemStatement.slice(0, 250),
          },
          unit_amount: amountInCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      purchaseId: purchase.id,
      ideaId: idea.id,
      userId,
    },
    success_url: `${envVars.FRONTEND_URL}/ideas/${idea.id}?payment=success`,
    cancel_url: `${envVars.FRONTEND_URL}/ideas/${idea.id}?payment=cancelled`,
  });

  if (!session.url) {
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      "Failed to create Stripe checkout session",
    );
  }

  const updatedPurchase = await prisma.ideaPurchase.update({
    where: { id: purchase.id },
    data: {
      transactionId: session.id,
    },
  });

  return {
    message: "Checkout session created successfully",
    checkoutUrl: session.url,
    purchase: updatedPurchase,
  };
};

const markPurchaseFailed = async (
  purchaseId: string,
  stripeEventId?: string,
) => {
  const purchase = await prisma.ideaPurchase.findUnique({
    where: { id: purchaseId },
  });

  if (!purchase || purchase.paymentStatus !== PaymentStatus.PENDING) {
    return purchase;
  }

  return prisma.ideaPurchase.update({
    where: { id: purchaseId },
    data: {
      paymentStatus: PaymentStatus.FAILED,
      ...(stripeEventId ? { stripeEventId } : {}),
    },
  });
};

/**
 * Complete a purchase after successful payment
 * Once completed, the user gains full access to the idea's paid content
 * Validates payment status and user/idea metadata before marking as complete
 */
const completePurchase = async (
  purchaseId: string,
  stripeEventId: string,
  session: {
    id: string;
    payment_status: string | null;
    metadata?: Record<string, string> | null;
  },
) => {
  const purchase = await prisma.ideaPurchase.findUnique({
    where: { id: purchaseId },
  });

  if (!purchase) {
    console.error(`Purchase ${purchaseId} not found for completed checkout`);
    return { message: "Purchase not found" };
  }

  if (purchase.paymentStatus === PaymentStatus.COMPLETED) {
    return { message: "Purchase already completed" };
  }

  // Verify payment was successful
  if (session.payment_status !== "paid") {
    await prisma.ideaPurchase.update({
      where: { id: purchaseId },
      data: {
        paymentStatus: PaymentStatus.FAILED,
        ...(stripeEventId ? { stripeEventId } : {}),
      },
    });

    console.log(
      `Checkout session ${session.id} was not paid for purchase ${purchaseId}. Marking it as failed.`,
    );

    return { message: "Checkout session payment was not successful" };
  }

  // Verify user matches
  if (session.metadata?.userId && session.metadata.userId !== purchase.userId) {
    console.error(
      `User mismatch for purchase ${purchaseId}. Expected ${purchase.userId}, got ${session.metadata.userId}`,
    );
    return { message: "Purchase user mismatch" };
  }

  // Verify idea matches
  if (session.metadata?.ideaId && session.metadata.ideaId !== purchase.ideaId) {
    console.error(
      `Idea mismatch for purchase ${purchaseId}. Expected ${purchase.ideaId}, got ${session.metadata.ideaId}`,
    );
    return { message: "Purchase idea mismatch" };
  }

  // Mark purchase as completed - user now has full access to the idea
  await prisma.ideaPurchase.update({
    where: { id: purchaseId },
    data: {
      paymentStatus: PaymentStatus.COMPLETED,
      transactionId: session.id,
      stripeEventId,
      completedAt: new Date(),
    },
  });

  console.log(
    `Payment completed for idea ${purchase.ideaId} by user ${purchase.userId}. User now has full access.`,
  );

  return { message: "Purchase completed successfully" };
};

const handleStripeWebhook = async (event: {
  id: string;
  type: string;
  data: { object: unknown };
}) => {
  const existingEvent = await prisma.ideaPurchase.findFirst({
    where: {
      stripeEventId: event.id,
    },
  });

  if (existingEvent) {
    console.log(`Stripe event ${event.id} already processed. Skipping.`);
    return { message: `Event ${event.id} already processed` };
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as {
        id: string;
        payment_status: string | null;
        metadata?: Record<string, string> | null;
      };
      const purchase = await getPurchaseBySessionOrMetadata(session);

      if (!purchase) {
        console.error(
          `Missing purchase for Stripe session ${session.id} in event ${event.type}`,
        );
        return { message: "Missing purchase metadata or session reference" };
      }

      return completePurchase(purchase.id, event.id, session);
    }

    case "checkout.session.expired":
    case "checkout.session.async_payment_failed":
    case "checkout.session.payment_failed": {
      const session = event.data.object as {
        id: string;
        metadata?: Record<string, string> | null;
      };
      const purchase = await getPurchaseBySessionOrMetadata(session);

      if (!purchase) {
        console.error(`No purchase found for expired session ${session.id}`);
        return { message: "Purchase not found for failed checkout session" };
      }

      await markPurchaseFailed(purchase.id, event.id);

      console.log(
        `Checkout session ${session.id} marked as failed for purchase ${purchase.id}`,
      );

      return { message: "Checkout session marked as failed" };
    }

    default:
      console.log(`Unhandled Stripe event type: ${event.type}`);
      return { message: `Unhandled event type: ${event.type}` };
  }
};

const getMyPurchases = async (
  userId: string,
  query: Record<string, unknown> = {},
) => {
  const paymentStatus =
    (query.paymentStatus as PaymentStatus | undefined) ??
    PaymentStatus.COMPLETED;

  return executeListQuery({
    model: prisma.ideaPurchase,
    query,
    config: {
      searchableFields: ["transactionId", "gateway"],
      filterableFields: ["paymentStatus", "gateway", "ideaId"],
    },
    where: {
      userId,
      paymentStatus,
    },
    include: ideaPurchaseInclude,
    defaultSort: { sortBy: "createdAt", sortOrder: "desc" },
  });
};

export const PurchaseServices = {
  initiatePurchase,
  handleStripeWebhook,
  getMyPurchases,
};
