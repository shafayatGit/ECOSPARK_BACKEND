import { NextFunction, Request, Response } from "express";
import status from "http-status";
import { UserRole, UserStatus } from "../../generated/prisma/enums";
import AppError from "../errors/AppError";
import { IUserJwtPayload } from "../interfaces/user.interface";
import { prisma } from "../lib/prisma";
import { envVars } from "../config/env";
import { cookieUtils } from "../utils/cookie";
import { jwtUtils } from "../utils/jwt";

const SESSION_COOKIE_KEY = "better-auth.session_token";
const ACCESS_TOKEN_COOKIE_KEYS = ["accessToken", "accesstoken"] as const;

const toUserPayload = (user: {
  id: string;
  role: string;
  email: string;
}): IUserJwtPayload => ({
  userId: user.id,
  role: user.role as UserRole,
  email: user.email,
});

const assertActiveUser = (user: {
  status: UserStatus;
  isDeleted: boolean;
}) => {
  if (user.isDeleted) {
    throw new AppError(status.FORBIDDEN, "Your account has been deleted.");
  }

  if (user.status === UserStatus.INACTIVE) {
    throw new AppError(
      status.FORBIDDEN,
      "Your account is inactive. Please contact support.",
    );
  }
};

const assertRoleAccess = (role: UserRole, authRoles: UserRole[]) => {
  if (authRoles.length > 0 && !authRoles.includes(role)) {
    throw new AppError(
      status.FORBIDDEN,
      "Forbidden, you don't have permission to access this resource.",
    );
  }
};

const setSessionRefreshHeaders = (
  res: Response,
  session: { expiresAt: Date; createdAt: Date },
) => {
  const now = Date.now();
  const expiresAt = new Date(session.expiresAt).getTime();
  const createdAt = new Date(session.createdAt).getTime();
  const sessionLifetime = expiresAt - createdAt;
  const timeRemaining = expiresAt - now;

  if (sessionLifetime <= 0) return;

  const percentageTimeRemaining = (timeRemaining / sessionLifetime) * 100;

  if (percentageTimeRemaining < 20) {
    res.setHeader("X-Session-Refresh", "true");
    res.setHeader("X-Session-Expires-At", new Date(expiresAt).toISOString());
    res.setHeader("X-Time-Remaining", timeRemaining.toString());
  }
};

const extractAccessToken = (req: Request): string | undefined => {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  for (const key of ACCESS_TOKEN_COOKIE_KEYS) {
    const token = cookieUtils.getCookie(req, key);
    if (token) return token;
  }

  return undefined;
};

const resolveUserFromSession = async (
  req: Request,
  res: Response,
): Promise<IUserJwtPayload | null> => {
  const sessionToken = cookieUtils.getCookie(req, SESSION_COOKIE_KEY);

  if (!sessionToken) return null;

  const session = await prisma.session.findFirst({
    where: {
      token: sessionToken,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  if (!session?.user) return null;

  assertActiveUser(session.user);
  setSessionRefreshHeaders(res, session);

  return toUserPayload(session.user);
};

const resolveUserFromAccessToken = async (
  req: Request,
): Promise<IUserJwtPayload | null> => {
  const accessToken = extractAccessToken(req);

  if (!accessToken) return null;

  const verifiedToken = jwtUtils.verifyToken(
    accessToken,
    envVars.ACCESS_TOKEN_SECRET,
  );

  if (!verifiedToken.success || !verifiedToken.decoded?.userId) {
    throw new AppError(status.UNAUTHORIZED, "Unauthorized - Invalid access token");
  }

  const user = await prisma.user.findUnique({
    where: { id: verifiedToken.decoded.userId as string },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      isDeleted: true,
    },
  });

  if (!user) {
    throw new AppError(status.UNAUTHORIZED, "Unauthorized - User not found");
  }

  assertActiveUser(user);

  return toUserPayload(user);
};

const resolveAuthenticatedUser = async (
  req: Request,
  res: Response,
): Promise<IUserJwtPayload | null> => {
  const sessionUser = await resolveUserFromSession(req, res);
  if (sessionUser) return sessionUser;

  return resolveUserFromAccessToken(req);
};

/**
 * RBAC middleware — session cookie first, then JWT access token (cookie or Bearer).
 * Reloads user from DB on the JWT path for fresh role/status.
 *
 * @example checkAuth() — any authenticated user
 * @example checkAuth(UserRole.ADMIN) — admin only
 */
export const checkAuth =
  (...authRoles: UserRole[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await resolveAuthenticatedUser(req, res);

      if (!user) {
        throw new AppError(
          status.UNAUTHORIZED,
          "Unauthorized - Authentication required",
        );
      }

      assertRoleAccess(user.role, authRoles);

      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };

/**
 * Optionally attaches req.user when a valid session or access token is present.
 * Does not block unauthenticated requests.
 */
export const optionalCheckAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await resolveAuthenticatedUser(req, res);

    if (user) {
      req.user = user;
    }

    next();
  } catch (error) {
    next(error);
  }
};
