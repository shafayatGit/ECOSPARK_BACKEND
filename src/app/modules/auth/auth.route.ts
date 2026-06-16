import { Router } from "express";
import { AuthControlles } from "./auth.controller";

const router = Router();

router.post("/register", AuthControlles.registerPatient);
router.post("/verify-email", AuthControlles.verifyEmail);
router.post("/login", AuthControlles.loginUser);
router.post("/logout", AuthControlles.logOutUser);
router.post("/forget-password", AuthControlles.forgetPassword);
router.post("/reset-password", AuthControlles.resetPassword);

export const AuthRoutes = router;
