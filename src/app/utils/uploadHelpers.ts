import { Request } from "express";

export const getSingleUploadedFileUrl = (req: Request): string | undefined => {
  return req.file?.path;
};

export const getMultipleUploadedFileUrls = (req: Request): string[] => {
  if (!req.files) {
    return [];
  }

  if (Array.isArray(req.files)) {
    return req.files
      .map((file) => file.path)
      .filter((url): url is string => Boolean(url));
  }

  const urls: string[] = [];

  Object.values(req.files).forEach((fileArray) => {
    if (Array.isArray(fileArray)) {
      fileArray.forEach((file) => {
        if (file.path) {
          urls.push(file.path);
        }
      });
    }
  });

  return urls;
};
