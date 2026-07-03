import status from "http-status";
import AppError from "../../errors/AppError";
import { auth } from "../../lib/auth";
import { ILoginUser, IRegisterMember } from "./auth.interface";
import { prisma } from "../../lib/prisma";
import { UserStatus } from "../../../generated/prisma/browser";
import { tokenUtils } from "../../utils/token";
import { IUserJwtPayload } from "../../interfaces/user.interface";

const registerPatient = async (payload: IRegisterMember) => {
  const isUserExist = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });
  if (isUserExist) {
    throw new AppError(status.BAD_REQUEST, "User already exists");
  }
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

  if (payload.image) {
    await prisma.user.update({
      where: { id: data.user.id },
      data: { image: payload.image },
    });
    data.user.image = payload.image;
  }

  const accessToken = tokenUtils.getAccessToken({
    userId: data.user.id,
    role: data.user.role,
    name: data.user.name,
    email: data.user.email,
    status: data.user.status,
    isDeleted: data.user.isDeleted,
    emailVerified: data.user.emailVerified,
  });

  const refreshToken = tokenUtils.getRefreshToken({
    userId: data.user.id,
    role: data.user.role,
    name: data.user.name,
    email: data.user.email,
    status: data.user.status,
    isDeleted: data.user.isDeleted,
    emailVerified: data.user.emailVerified,
  });

  return {
    accessToken,
    refreshToken,
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

  const accessToken = tokenUtils.getAccessToken({
    userId: data.user.id,
    role: data.user.role,
    name: data.user.name,
    email: data.user.email,
    status: data.user.status,
    isDeleted: data.user.isDeleted,
    emailVerified: data.user.emailVerified,
  });

  const refreshToken = tokenUtils.getRefreshToken({
    userId: data.user.id,
    role: data.user.role,
    name: data.user.name,
    email: data.user.email,
    status: data.user.status,
    isDeleted: data.user.isDeleted,
    emailVerified: data.user.emailVerified,
  });

  return {
    accessToken,
    refreshToken,
    ...data,
  };
};

const forgetPassword = async (email: string) => {
  const isUserExist = await prisma.user.findUnique({
    where: {
      email,
    },
  });
  if (!isUserExist) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }
  const result = await auth.api.requestPasswordResetEmailOTP({
    body: {
      email,
    },
  });
  return result;
};

const resetPassword = async (
  email: string,
  otp: string,
  newPassword: string,
) => {
  const isUserExist = await prisma.user.findUnique({
    where: {
      email,
    },
  });
  if (!isUserExist) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  const result = await auth.api.resetPasswordEmailOTP({
    body: {
      email,
      otp,
      password: newPassword,
    },
  });

  if (isUserExist.needPasswordChange) {
    await prisma.user.update({
      where: {
        id: isUserExist.id,
      },
      data: {
        needPasswordChange: false,
      },
    });
  }

  await prisma.session.deleteMany({
    where: {
      userId: isUserExist.id,
    },
  });
  return result;
};

async function updateProfile(
  userId: string,
  payload: { name?: string; image?: string },
) {
  const userExist = await prisma.user.findUnique({ where: { id: userId } });

  if (!userExist) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  const data: Record<string, unknown> = {};

  if (payload.name !== undefined) data.name = payload.name;
  if (payload.image !== undefined) data.image = payload.image;

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
  });

  return updated;
}

const getMe = async (user: IUserJwtPayload) => {
  const { userId } = user;
  // console.log("UserID: ", userId);
  const userExist = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      admin: true,
    },
  });

  if (!userExist) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }
  return userExist;
};

const logOutUser = async (sessionToken: string) => {
  const result = await auth.api.signOut({
    headers: new Headers({
      Authorization: `Bearer ${sessionToken}`,
    }),
  });
  return result;
};

const googleLoginSuccess = async (session: Record<string, any>) => {
  const isUserExist = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
  });

  if (!isUserExist) {
    await prisma.user.create({
      data: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
    });
  }

  const accessToken = tokenUtils.getAccessToken({
    userId: session.user.id,
    role: session.user.role,
    name: session.user.name,
  });

  const refreshToken = tokenUtils.getRefreshToken({
    userId: session.user.id,
    role: session.user.role,
    name: session.user.name,
  });
  return {
    accessToken,
    refreshToken,
  };
};
export const AuthServices = {
  registerPatient,
  verifyEmail,
  loginUser,
  logOutUser,
  forgetPassword,
  resetPassword,
  getMe,
  googleLoginSuccess,
  updateProfile,
};

// updateProfile is exported as part of AuthServices
