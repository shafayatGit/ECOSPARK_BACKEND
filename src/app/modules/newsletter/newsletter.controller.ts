import status from "http-status";
import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { NewsletterServices } from "./newsletter.service";

const subscribe = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsletterServices.subscribe(req.body);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Subscribed to newsletter successfully",
    data: result,
  });
});

const unsubscribe = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsletterServices.unsubscribe(req.body);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Unsubscribed from newsletter successfully",
    data: result,
  });
});

export const NewsletterControllers = {
  subscribe,
  unsubscribe,
};
