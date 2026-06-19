import status from "http-status";
import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { getQueryParams } from "../../middlewares/validateQuery";
import { AdminPurchaseServices } from "./adminPurchases.service";

const getAllPurchases = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminPurchaseServices.getAllPurchases(
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

export const AdminPurchaseControllers = {
  getAllPurchases,
};
