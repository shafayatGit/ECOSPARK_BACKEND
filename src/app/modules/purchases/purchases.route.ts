import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { validateQuery } from "../../middlewares/validateQuery";
import { validateRequest } from "../../middlewares/validateRequest";
import { purchaseListQuerySchema } from "../../validations/listQuery.validation";
import { PurchaseControllers } from "./purchases.controller";
import {
  initiatePurchaseSchema,
  webhookPayloadSchema,
} from "./purchases.validation";

const router = Router();

router.post(
  "/initiate",
  checkAuth(),
  validateRequest(initiatePurchaseSchema),
  PurchaseControllers.initiatePurchase,
);

router.post(
  "/webhook",
  validateRequest(webhookPayloadSchema),
  PurchaseControllers.handleWebhook,
);

router.get(
  "/my",
  checkAuth(),
  validateQuery(purchaseListQuerySchema),
  PurchaseControllers.getMyPurchases,
);

export const PurchaseRoutes = router;
