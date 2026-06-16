import { Router } from "express";
import { AuthControlles } from "./auth.controller";

const router = Router();

router.post("/register", AuthControlles.registerPatient);
router.post("/verify-email", AuthControlles.verifyEmail);
router.post("/login", AuthControlles.loginUser);
router.post("/logout", AuthControlles.logOutUser);

export const AuthRoutes = router;
