import status from "http-status";
import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { getQueryParams } from "../../middlewares/validateQuery";
import AppError from "../../errors/AppError";
import { envVars } from "../../config/env";
import { stripe } from "../../config/stripe.config";
import { PurchaseServices } from "./purchases.service";

const initiatePurchase = catchAsync(async (req: Request, res: Response) => {
  const result = await PurchaseServices.initiatePurchase(
    req.body,
    req.user!.userId,
  );

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: result.message,
    data: result,
  });
});

const handleStripeWebhook = catchAsync(async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"];

  if (!signature || typeof signature !== "string") {
    throw new AppError(status.BAD_REQUEST, "Missing Stripe signature header");
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      envVars.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    throw new AppError(
      status.BAD_REQUEST,
      `Webhook signature verification failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }

  const result = await PurchaseServices.handleStripeWebhook(event);

  res.status(status.OK).json({
    success: true,
    message: "Webhook processed successfully",
    data: result,
  });
});

const getMyPurchases = catchAsync(async (req: Request, res: Response) => {
  const result = await PurchaseServices.getMyPurchases(
    req.user!.userId,
    getQueryParams(req),
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Purchases retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const PurchaseControllers = {
  initiatePurchase,
  handleStripeWebhook,
  getMyPurchases,
};
