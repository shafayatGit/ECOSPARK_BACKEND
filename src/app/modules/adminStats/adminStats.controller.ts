import status from "http-status";
import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { AdminStatsServices } from "./adminStats.service";

const getDashboardStats = catchAsync(async (_req: Request, res: Response) => {
  const result = await AdminStatsServices.getDashboardStats();

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Admin dashboard stats retrieved successfully",
    data: result,
  });
});

export const AdminStatsControllers = {
  getDashboardStats,
};
