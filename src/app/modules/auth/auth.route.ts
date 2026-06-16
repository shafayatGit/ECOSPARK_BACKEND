import { Router } from "express";
import { AuthControllers } from "./auth.controller";

const router = Router();

router.post("/register", AuthControllers.registerPatient);
router.post("/verify-email", AuthControllers.verifyEmail);
router.post("/login", AuthControllers.loginUser);
router.post("/logout", AuthControllers.logOutUser);
router.post("/forget-password", AuthControllers.forgetPassword);
router.post("/reset-password", AuthControllers.resetPassword);

//Google Routes
router.get("/login/google", AuthControllers.googleLogin);
router.get("/google/success", AuthControllers.googleLoginSuccess);
router.get("/oauth/error", AuthControllers.handleOAuthError);

export const AuthRoutes = router;
