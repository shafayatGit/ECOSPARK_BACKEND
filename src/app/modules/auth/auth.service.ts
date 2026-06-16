import status from "http-status";
import AppError from "../../errors/AppError";
import { auth } from "../../lib/auth";
import { IRegisterMember } from "./auth.interface";

const registerPatient = async (payload: IRegisterMember) => {
  const { name, email, password } = payload;
  const data = await auth.api.signUpEmail({
    body: {
      name,
      email,
      password,
    },
  });
  if (!data.user) {
    throw new AppError(status.BAD_REQUEST, "Failed to create user");
  }

  return {
    ...data,
  };
};

export const AuthServices = {
  registerPatient,
};
