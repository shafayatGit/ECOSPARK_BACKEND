import status from "http-status";
import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { getQueryParams } from "../../middlewares/validateQuery";
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

const handleWebhook = catchAsync(async (req: Request, res: Response) => {
  const result = await PurchaseServices.handleWebhook(req.body);

  sendResponse(res, {
    httpStatusCode: status.OK,
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
  handleWebhook,
  getMyPurchases,
};
