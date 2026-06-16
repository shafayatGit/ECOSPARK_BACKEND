import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { validateRequest } from "../../middlewares/validateRequest";
import { VoteControllers } from "./votes.controller";
import { castVoteSchema } from "./votes.validation";

const router = Router();

router.use(checkAuth());

router.post("/", validateRequest(castVoteSchema), VoteControllers.castVote);

router.delete("/:ideaId", VoteControllers.removeVote);

router.get("/:ideaId", VoteControllers.getMyVote);

export const VoteRoutes = router;
