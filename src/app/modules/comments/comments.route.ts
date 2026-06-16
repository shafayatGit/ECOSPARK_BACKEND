import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { validateQuery } from "../../middlewares/validateQuery";
import { validateRequest } from "../../middlewares/validateRequest";
import { CommentControllers } from "./comments.controller";
import { createCommentSchema, getCommentsQuerySchema } from "./comments.validation";

const router = Router();

router.get(
  "/idea/:ideaId",
  validateQuery(getCommentsQuerySchema),
  CommentControllers.getCommentsByIdea,
);

router.post(
  "/",
  checkAuth(),
  validateRequest(createCommentSchema),
  CommentControllers.createComment,
);

router.delete("/:id", checkAuth(), CommentControllers.deleteComment);

export const CommentRoutes = router;
