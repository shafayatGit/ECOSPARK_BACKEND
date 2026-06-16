import { NextFunction, Request, Response } from "express";
import z from "zod";

export const getQueryParams = (req: Request): Record<string, unknown> => {
  return (req.validatedQuery ?? req.query) as Record<string, unknown>;
};

export const validateQuery = (zodObject: z.ZodObject) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parseResult = zodObject.safeParse(req.query);

    if (!parseResult.success) {
      return next(parseResult.error);
    }

    // Express 5 makes req.query read-only — store parsed values separately
    req.validatedQuery = parseResult.data as Record<string, unknown>;
    next();
  };
};
