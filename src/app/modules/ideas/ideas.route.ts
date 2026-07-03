import { Router } from "express";
import { checkAuth, optionalCheckAuth } from "../../middlewares/checkAuth";
import { validateQuery } from "../../middlewares/validateQuery";
import { validateRequest } from "../../middlewares/validateRequest";
import { optionalMultipleUpload } from "../../config/multer.config";
import { IdeaControllers } from "./ideas.controller";
import {
  createIdeaSchema,
  getIdeasQuerySchema,
  getMyIdeasQuerySchema,
  updateIdeaSchema,
} from "./ideas.validation";

const router = Router();

router.get(
  "/",
  validateQuery(getIdeasQuerySchema),
  IdeaControllers.getApprovedIdeas,
);

router.get(
  "/my",
  checkAuth(),
  validateQuery(getMyIdeasQuerySchema),
  IdeaControllers.getMyIdeas,
);

router.get("/:id", optionalCheckAuth, IdeaControllers.getIdeaById);

router.post(
  "/",
  checkAuth(),
  optionalMultipleUpload("images", 4),
  validateRequest(createIdeaSchema),
  IdeaControllers.createIdea,
);

router.patch(
  "/:id",
  checkAuth(),
  validateRequest(updateIdeaSchema),
  IdeaControllers.updateIdea,
);

router.post("/:id/submit", checkAuth(), IdeaControllers.submitIdea);

router.delete("/:id", checkAuth(), IdeaControllers.deleteIdea);

export const IdeaRoutes = router;
