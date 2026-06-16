import status from "http-status";
import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import {
  ISubscribeNewsletter,
  IUnsubscribeNewsletter,
} from "./newsletter.interface";

const subscribe = async (payload: ISubscribeNewsletter) => {
  const existing = await prisma.newsletterSubscriber.findUnique({
    where: { email: payload.email },
  });

  if (existing) {
    if (existing.isActive) {
      throw new AppError(
        status.CONFLICT,
        "This email is already subscribed",
      );
    }

    return prisma.newsletterSubscriber.update({
      where: { email: payload.email },
      data: { isActive: true, subscribedAt: new Date() },
    });
  }

  return prisma.newsletterSubscriber.create({
    data: { email: payload.email },
  });
};

const unsubscribe = async (payload: IUnsubscribeNewsletter) => {
  const existing = await prisma.newsletterSubscriber.findUnique({
    where: { email: payload.email },
  });

  if (!existing) {
    throw new AppError(status.NOT_FOUND, "Email not found in subscribers list");
  }

  if (!existing.isActive) {
    throw new AppError(status.BAD_REQUEST, "Email is already unsubscribed");
  }

  return prisma.newsletterSubscriber.update({
    where: { email: payload.email },
    data: { isActive: false },
  });
};

export const NewsletterServices = {
  subscribe,
  unsubscribe,
};
