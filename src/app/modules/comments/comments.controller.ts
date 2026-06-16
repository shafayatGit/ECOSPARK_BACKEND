import status from "http-status";
import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { getQueryParams } from "../../middlewares/validateQuery";
import { CommentServices } from "./comments.service";

const createComment = catchAsync(async (req: Request, res: Response) => {
  const result = await CommentServices.createComment(
    req.body,
    req.user!.userId,
  );

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Comment created successfully",
    data: result,
  });
});

const getCommentsByIdea = catchAsync(async (req: Request, res: Response) => {
  const result = await CommentServices.getCommentsByIdea(
    req.params.ideaId as string,
    getQueryParams(req),
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Comments retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const deleteComment = catchAsync(async (req: Request, res: Response) => {
  const result = await CommentServices.deleteComment(
    req.params.id as string,
    req.user!.userId,
    req.user!.role,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Comment deleted successfully",
    data: result,
  });
});

export const CommentControllers = {
  createComment,
  getCommentsByIdea,
  deleteComment,
};
