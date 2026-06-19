import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { UserRole } from "../../../generated/prisma/enums";
import { AdminStatsControllers } from "./adminStats.controller";

const router = Router();

router.use(checkAuth(UserRole.ADMIN));

router.get("/", AdminStatsControllers.getDashboardStats);

export const AdminStatsRoutes = router;
