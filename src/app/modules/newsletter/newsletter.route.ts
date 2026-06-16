import { Router } from "express";
import { validateRequest } from "../../middlewares/validateRequest";
import { NewsletterControllers } from "./newsletter.controller";
import { subscribeSchema, unsubscribeSchema } from "./newsletter.validation";

const router = Router();

router.post(
  "/subscribe",
  validateRequest(subscribeSchema),
  NewsletterControllers.subscribe,
);

router.post(
  "/unsubscribe",
  validateRequest(unsubscribeSchema),
  NewsletterControllers.unsubscribe,
);

export const NewsletterRoutes = router;
