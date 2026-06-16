import status from "http-status";
import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { VoteServices } from "./votes.service";

const castVote = catchAsync(async (req: Request, res: Response) => {
  const result = await VoteServices.castVote(req.body, req.user!.userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Vote recorded successfully",
    data: result,
  });
});

const removeVote = catchAsync(async (req: Request, res: Response) => {
  const result = await VoteServices.removeVote(
    req.params.ideaId as string,
    req.user!.userId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Vote removed successfully",
    data: result,
  });
});

const getMyVote = catchAsync(async (req: Request, res: Response) => {
  const result = await VoteServices.getMyVoteForIdea(
    req.params.ideaId as string,
    req.user!.userId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Vote retrieved successfully",
    data: result,
  });
});

export const VoteControllers = {
  castVote,
  removeVote,
  getMyVote,
};
