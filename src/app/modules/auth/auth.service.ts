import status from "http-status";
import AppError from "../../errors/AppError";
import { auth } from "../../lib/auth";
import { ILoginUser, IRegisterMember } from "./auth.interface";
import { prisma } from "../../lib/prisma";
import { UserStatus } from "../../../generated/prisma/browser";

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
const verifyEmail = async (email: string, otp: string) => {
  const result = await auth.api.verifyEmailOTP({
    body: {
      email,
      otp,
    },
  });
  if (result.status && !result.user.emailVerified) {
    await prisma.user.update({
      where: {
        email: result.user.email,
      },
      data: {
        emailVerified: true,
      },
    });
  }
  //   console.log("from verifyEmail:", result.token);
  return result;
};

const loginUser = async (payload: ILoginUser) => {
  const { email, password } = payload;
  const data = await auth.api.signInEmail({
    body: {
      email,
      password,
    },
  });
  if (data.user.status === UserStatus.INACTIVE) {
    throw new AppError(
      status.FORBIDDEN,
      "User is inactive. Please contact support.",
    );
  }

  return {
    ...data,
  };
};

const logOutUser = async (sessionToken: string) => {
  const result = await auth.api.signOut({
    headers: new Headers({
      Authorization: `Bearer ${sessionToken}`,
    }),
  });
  return result;
};
export const AuthServices = {
  registerPatient,
  verifyEmail,
  loginUser,
  logOutUser,
};
