import status from "http-status";
import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { getQueryParams } from "../../middlewares/validateQuery";
import { AdminIdeaServices } from "./adminIdeas.service";

const getReviewQueue = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminIdeaServices.getReviewQueue(getQueryParams(req));

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Review queue retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const startReview = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminIdeaServices.startReview(req.params.id as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea moved to under review",
    data: result,
  });
});

const approveIdea = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminIdeaServices.approveIdea(req.params.id as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea approved successfully",
    data: result,
  });
});

const rejectIdea = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminIdeaServices.rejectIdea(
    req.params.id as string,
    req.body.rejectionFeedback,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea rejected successfully",
    data: result,
  });
});

export const AdminIdeaControllers = {
  getReviewQueue,
  startReview,
  approveIdea,
  rejectIdea,
};
