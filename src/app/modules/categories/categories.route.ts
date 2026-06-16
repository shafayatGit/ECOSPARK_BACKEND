import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { validateQuery } from "../../middlewares/validateQuery";
import { validateRequest } from "../../middlewares/validateRequest";
import { categoryListQuerySchema } from "../../validations/listQuery.validation";
import { CategoryControllers } from "./categories.controller";
import { createCategorySchema } from "./categories.validation";
import { UserRole } from "../../../generated/prisma/enums";

const router = Router();

router.get(
  "/",
  validateQuery(categoryListQuerySchema),
  CategoryControllers.getAllCategories,
);

router.post(
  "/",
  checkAuth(UserRole.ADMIN),
  validateRequest(createCategorySchema),
  CategoryControllers.createCategory,
);

router.delete(
  "/:id",
  checkAuth(UserRole.ADMIN),
  CategoryControllers.deleteCategory,
);

export const CategoryRoutes = router;
