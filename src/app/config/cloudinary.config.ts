import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { envVars } from "./env";
import status from "http-status";
import AppError from "../errors/AppError";

cloudinary.config({
  cloud_name: envVars.CLOUDINARY.CLOUDINARY_CLOUD_NAME,
  api_key: envVars.CLOUDINARY.CLOUDINARY_API_KEY,
  api_secret: envVars.CLOUDINARY.CLOUDINARY_API_SECRET,
});

export const uploadFiletoCloudinary = async (
  buffer: Buffer,
  fileName: string,
): Promise<UploadApiResponse> => {
  if (!buffer && !fileName) {
    throw new AppError(status.BAD_REQUEST, "Buffer and fileName are required");
  }

  const extension = fileName.split(".").pop()?.toLowerCase();

  const fileNameWithOutExtention = fileName
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

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `ecospark/${folder}`,
          public_id: `ecospark/${folder}/${uniqueName}`,
          resource_type: "auto",
        },
        (error, result) => {
          if (error) {
            return reject(
              new AppError(
                status.BAD_REQUEST,
                "Failed to upload file to Cloudinary",
              ),
            );
          } else {
            resolve(result as UploadApiResponse);
          }
        },
      )
      .end(buffer);
  });
};

export const deleteFileFromCloudinary = async (url: string) => {
  try {
    const regex = /\/v\d+\/(.+?)(?:\.[a-zA-Z0-9]+)+$/;
    const match = url.match(regex);

    if (match && match[1]) {
      const publicId = match[1];
      await cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
      });
      console.log(`File ${publicId} deleted from Cloudinary`);
    }
  } catch (error) {
    console.log(error);
    throw new AppError(
      status.BAD_REQUEST,
      "Failed to delete file from Cloudinary",
    );
  }
};

export const cloudinaryUpload = cloudinary;
