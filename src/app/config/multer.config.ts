import { NextFunction, Request, Response } from "express";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import status from "http-status";
import multer from "multer";
import AppError from "../errors/AppError";
import { cloudinaryUpload } from "./cloudinary.config";

const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

const imageFileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(new Error("Only image files (JPEG, PNG, WEBP, GIF) are allowed"));
};

const storage = new CloudinaryStorage({
  cloudinary: cloudinaryUpload,
  params: async (_req, file) => {
    const originalName = file.originalname;
    const extension = originalName.split(".").pop()?.toLowerCase();

    const fileNameWithOutExtention = originalName
      .split(".")
      .slice(0, -1)
      .join(".")
      .toLowerCase()
      .replace(/\s*/g, "-")
      .replace(/[^a-z0-9\-]/g, "");

    const uniqueName =
      Math.random().toString(36).substring(2) +
      "-" +
      Date.now() +
      "-" +
      fileNameWithOutExtention;

    const folder = extension === "pdf" ? "pdfs" : "images";

    return {
      folder: `ecospark/${folder}`,
      public_id: uniqueName,
      resource_type: "auto",
    };
  },
});

export const multerUpload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const handleMulterError = (
  err: unknown,
  next: NextFunction,
  maxCount?: number,
) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(
        new AppError(status.BAD_REQUEST, "Each image must be 5MB or smaller"),
      );
    }

    if (err.code === "LIMIT_FILE_COUNT" && maxCount) {
      return next(
        new AppError(
          status.BAD_REQUEST,
          `You can upload a maximum of ${maxCount} image(s)`,
        ),
      );
    }

    if (err.code === "LIMIT_UNEXPECTED_FILE" && maxCount) {
      return next(
        new AppError(
          status.BAD_REQUEST,
          `You can upload a maximum of ${maxCount} image(s)`,
        ),
      );
    }

    return next(new AppError(status.BAD_REQUEST, err.message));
  }

  if (err instanceof Error) {
    return next(new AppError(status.BAD_REQUEST, err.message));
  }

  return next(err);
};

export const optionalSingleUpload = (fieldName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.is("multipart/form-data")) {
      return next();
    }

    multerUpload.single(fieldName)(req, res, (err) => {
      if (err) {
        return handleMulterError(err, next, 1);
      }

      next();
    });
  };
};

export const optionalMultipleUpload = (fieldName: string, maxCount: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.is("multipart/form-data")) {
      return next();
    }

    multerUpload.array(fieldName, maxCount)(req, res, (err) => {
      if (err) {
        return handleMulterError(err, next, maxCount);
      }

      next();
    });
  };
};
