import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { validateQuery } from "../../middlewares/validateQuery";
import { purchaseListQuerySchema } from "../../validations/listQuery.validation";
import { AdminPurchaseControllers } from "./adminPurchases.controller";
import { UserRole } from "../../../generated/prisma/enums";

const router = Router();

router.use(checkAuth(UserRole.ADMIN));

router.get(
  "/",
  validateQuery(purchaseListQuerySchema),
  AdminPurchaseControllers.getAllPurchases,
);

export const AdminPurchaseRoutes = router;
