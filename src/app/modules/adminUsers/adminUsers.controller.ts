import status from "http-status";
import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { getQueryParams } from "../../middlewares/validateQuery";
import { AdminUserServices } from "./adminUsers.service";

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminUserServices.getAllUsers(getQueryParams(req));

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Users retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const activateUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminUserServices.activateUser(req.params.id as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User activated successfully",
    data: result,
  });
});

const deactivateUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminUserServices.deactivateUser(
    req.params.id as string,
    req.user!.userId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User deactivated successfully",
    data: result,
  });
});

const updateUserRole = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminUserServices.updateUserRole(
    req.params.id as string,
    req.body.role,
    req.user!.userId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User role updated successfully",
    data: result,
  });
});

export const AdminUserControllers = {
  getAllUsers,
  activateUser,
  deactivateUser,
  updateUserRole,
};
