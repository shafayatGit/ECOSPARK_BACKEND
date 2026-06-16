import status from "http-status";
import { UserRole, UserStatus } from "../../../generated/prisma/enums";
import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { executeListQuery } from "../../utils/queryHelper";

const getUserOrThrow = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      isDeleted: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user || user.isDeleted) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  return user;
};

const userListInclude = {
  _count: {
    select: {
      ideasAuthored: true,
      votes: true,
      comments: true,
    },
  },
} as const;

const getAllUsers = async (query: Record<string, unknown> = {}) => {
  return executeListQuery({
    model: prisma.user,
    query,
    config: {
      searchableFields: ["name", "email"],
      filterableFields: ["role", "status", "emailVerified"],
    },
    where: { isDeleted: false },
    include: userListInclude,
    defaultSort: { sortBy: "createdAt", sortOrder: "desc" },
  });
};

const activateUser = async (userId: string) => {
  await getUserOrThrow(userId);

  return prisma.user.update({
    where: { id: userId },
    data: { status: UserStatus.ACTIVE },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  });
};

const deactivateUser = async (userId: string, adminId: string) => {
  if (userId === adminId) {
    throw new AppError(
      status.BAD_REQUEST,
      "You cannot deactivate your own account",
    );
  }

  await getUserOrThrow(userId);

  return prisma.user.update({
    where: { id: userId },
    data: { status: UserStatus.INACTIVE },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  });
};

const updateUserRole = async (
  userId: string,
  role: UserRole,
  adminId: string,
) => {
  if (userId === adminId) {
    throw new AppError(
      status.BAD_REQUEST,
      "You cannot change your own role",
    );
  }

  await getUserOrThrow(userId);

  return prisma.user.update({
    where: { id: userId },
    data: { role },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  });
};

export const AdminUserServices = {
  getAllUsers,
  activateUser,
  deactivateUser,
  updateUserRole,
};
