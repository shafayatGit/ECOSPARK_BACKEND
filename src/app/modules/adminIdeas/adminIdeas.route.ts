import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { validateQuery } from "../../middlewares/validateQuery";
import { validateRequest } from "../../middlewares/validateRequest";
import { AdminIdeaControllers } from "./adminIdeas.controller";
import {
  adminIdeasQuerySchema,
  rejectIdeaSchema,
} from "./adminIdeas.validation";
import { UserRole } from "../../../generated/prisma/enums";

const router = Router();

router.use(checkAuth(UserRole.ADMIN));

router.get(
  "/",
  validateQuery(adminIdeasQuerySchema),
  AdminIdeaControllers.getReviewQueue,
);

router.patch("/:id/review", AdminIdeaControllers.startReview);

router.patch("/:id/approve", AdminIdeaControllers.approveIdea);

router.patch(
  "/:id/reject",
  validateRequest(rejectIdeaSchema),
  AdminIdeaControllers.rejectIdea,
);

export const AdminIdeaRoutes = router;
