import status from "http-status";
import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { getQueryParams } from "../../middlewares/validateQuery";
import { CategoryServices } from "./categories.service";

const getAllCategories = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryServices.getAllCategories(getQueryParams(req));

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Categories retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const createCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryServices.createCategory(
    req.body,
    req.user!.userId,
  );

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Category created successfully",
    data: result,
  });
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryServices.deleteCategory(req.params.id as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Category deleted successfully",
    data: result,
  });
});

export const CategoryControllers = {
  getAllCategories,
  createCategory,
  deleteCategory,
};
