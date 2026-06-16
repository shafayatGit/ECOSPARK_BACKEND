import z from "zod";
import { TErrorResponse, TErrorSources } from "../interfaces/error.interface";
import status from "http-status";

export const handleZodError = (err: z.ZodError): TErrorResponse => {
  let statusCode = status.BAD_REQUEST;
  let message = "Zod Validation Error";
  let errorSources: TErrorSources[] = [];

  err.issues.forEach((issue) => {
    errorSources.push({
      path: issue.path.join("=>") || "unknown",
      message: issue.message,
    });
  });
  return { statusCode, success: false, message, errorSources };
};
