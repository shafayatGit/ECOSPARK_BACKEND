import status from "http-status";
import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { getQueryParams } from "../../middlewares/validateQuery";
import { IdeaServices } from "./ideas.service";
import { getMultipleUploadedFileUrls } from "../../utils/uploadHelpers";

const createIdea = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaServices.createIdea(
    {
      ...req.body,
      imageUrls: getMultipleUploadedFileUrls(req),
    },
    req.user!.userId,
  );

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Idea created as draft successfully",
    data: result,
  });
});

const getApprovedIdeas = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaServices.getApprovedIdeas(getQueryParams(req));

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Ideas retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getIdeaById = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaServices.getIdeaById(
    req.params.id as string,
    req.user,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea retrieved successfully",
    data: result,
  });
});

const getMyIdeas = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaServices.getMyIdeas(
    req.user!.userId,
    getQueryParams(req),
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Your ideas retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const updateIdea = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaServices.updateIdea(
    req.params.id as string,
    req.body,
    req.user!.userId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea updated successfully",
    data: result,
  });
});

const submitIdea = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaServices.submitIdeaForReview(
    req.params.id as string,
    req.user!.userId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea submitted for review successfully",
    data: result,
  });
});

const deleteIdea = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaServices.deleteIdea(
    req.params.id as string,
    req.user!.userId,
    req.user!.role,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea deleted successfully",
    data: result,
  });
});

export const IdeaControllers = {
  createIdea,
  getApprovedIdeas,
  getIdeaById,
  getMyIdeas,
  updateIdea,
  submitIdea,
  deleteIdea,
};
