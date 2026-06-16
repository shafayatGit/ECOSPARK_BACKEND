import { Router } from "express";
import { AuthControlles } from "./auth.controller";

const router = Router();

router.post("/register", AuthControlles.registerPatient);

export const AuthRoutes = router;
