import { NextFunction, Request, Response } from "express";
import z from "zod";

export const validateRequest = (zodObject: z.ZodObject) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.body.data) {
      req.body = JSON.parse(req.body.data);
    }
    const parseResult = zodObject.safeParse(req.body);

    if (!parseResult.success) {
      return next(parseResult.error);
    }

    // If validation is successful, proceed to the controller
    req.body = parseResult.data; // Use the parsed data
    next();
  };
};
