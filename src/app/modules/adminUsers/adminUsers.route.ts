import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { validateQuery } from "../../middlewares/validateQuery";
import { validateRequest } from "../../middlewares/validateRequest";
import { adminUserListQuerySchema } from "../../validations/listQuery.validation";
import { AdminUserControllers } from "./adminUsers.controller";
import { updateUserRoleSchema } from "./adminUsers.validation";
import { UserRole } from "../../../generated/prisma/enums";

const router = Router();

router.use(checkAuth(UserRole.ADMIN));

router.get(
  "/",
  validateQuery(adminUserListQuerySchema),
  AdminUserControllers.getAllUsers,
);

router.patch("/:id/activate", AdminUserControllers.activateUser);

router.patch("/:id/deactivate", AdminUserControllers.deactivateUser);

router.patch(
  "/:id/role",
  validateRequest(updateUserRoleSchema),
  AdminUserControllers.updateUserRole,
);

export const AdminUserRoutes = router;
