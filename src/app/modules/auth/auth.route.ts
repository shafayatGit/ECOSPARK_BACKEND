import { Router } from "express";
import { AuthControllers } from "./auth.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { validateRequest } from "../../middlewares/validateRequest";
import { optionalSingleUpload } from "../../config/multer.config";
import { UserRole } from "../../../generated/prisma/enums";
import { registerPatientSchema, updateProfileSchema } from "./auth.validation";
const router = Router();

router.post(
  "/register",
  optionalSingleUpload("image"),
  validateRequest(registerPatientSchema),
  AuthControllers.registerPatient,
);
router.post("/verify-email", AuthControllers.verifyEmail);
router.post("/login", AuthControllers.loginUser);
router.get(
  "/me",
  checkAuth(UserRole.ADMIN, UserRole.MEMBER),
  AuthControllers.getMe,
);
router.put(
  "/profile",
  checkAuth(UserRole.ADMIN, UserRole.MEMBER),
  optionalSingleUpload("image"),
  validateRequest(updateProfileSchema),
  AuthControllers.updateProfile,
);
router.post("/logout", AuthControllers.logOutUser);
router.post("/forget-password", AuthControllers.forgetPassword);
router.post("/reset-password", AuthControllers.resetPassword);
router.post(
  "/change-password",
  checkAuth(UserRole.ADMIN, UserRole.MEMBER),
  AuthControllers.changePassword,
);
//Google Routes
router.get("/login/google", AuthControllers.googleLogin);
router.get("/google/success", AuthControllers.googleLoginSuccess);
router.get("/oauth/error", AuthControllers.handleOAuthError);

export const AuthRoutes = router;
