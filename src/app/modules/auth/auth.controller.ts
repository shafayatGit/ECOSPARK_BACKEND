import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { AuthServices } from "./auth.service";

const registerPatient = catchAsync(async (req, res) => {
  const payload = req.body;
  // Call the service function to handle the registration logic
  const data = await AuthServices.registerPatient(payload);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "User registered successfully",
    data,
  });
});

export const AuthControlles = {
  registerPatient,
};
