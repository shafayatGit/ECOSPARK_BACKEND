import { Router } from "express";
import { AuthRoutes } from "../modules/auth/auth.route";
import { CategoryRoutes } from "../modules/categories/categories.route";
import { IdeaRoutes } from "../modules/ideas/ideas.route";
import { VoteRoutes } from "../modules/votes/votes.route";
import { CommentRoutes } from "../modules/comments/comments.route";
import { PurchaseRoutes } from "../modules/purchases/purchases.route";
import { NewsletterRoutes } from "../modules/newsletter/newsletter.route";
import { AdminIdeaRoutes } from "../modules/adminIdeas/adminIdeas.route";
import { AdminUserRoutes } from "../modules/adminUsers/adminUsers.route";
import { AdminStatsRoutes } from "../modules/adminStats/adminStats.route";
import { AdminPurchaseRoutes } from "../modules/adminPurchases/adminPurchases.route";

const router = Router();

router.use("/auth", AuthRoutes);
router.use("/api/categories", CategoryRoutes);
router.use("/api/ideas", IdeaRoutes);
router.use("/api/votes", VoteRoutes);
router.use("/api/comments", CommentRoutes);
router.use("/api/purchases", PurchaseRoutes);
router.use("/api/newsletter", NewsletterRoutes);
router.use("/api/admin/ideas", AdminIdeaRoutes);
router.use("/api/admin/users", AdminUserRoutes);
router.use("/api/admin/stats", AdminStatsRoutes);
router.use("/api/admin/purchases", AdminPurchaseRoutes);

export const IndexRoutes = router;
