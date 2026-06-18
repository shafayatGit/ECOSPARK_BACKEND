import express, { Application, Request, Response } from "express";
import cors from "cors";
import { IndexRoutes } from "./app/routes";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./app/lib/auth";
import path from "path";
import cookieParser from "cookie-parser";
import { envVars } from "./app/config/env";
import { globalErrorHandler } from "./app/middlewares/globalErrorHandler";
import notFound from "./app/middlewares/notFound";
import { PurchaseControllers } from "./app/modules/purchases/purchases.controller";

const app: Application = express();
app.use(
  cors({
    origin: [
      envVars.FRONTEND_URL,
      envVars.BETTER_AUTH_URL,
      "http://localhost:3000",
      "http://localhost:9000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use("/api/auth", toNodeHandler(auth));
app.set("view engine", "ejs"); // Set the views directory to the absolute path of src/app/templates
app.set("views", path.resolve(process.cwd(), `src/app/templates`));


app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  PurchaseControllers.handleStripeWebhook,
);
// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies.
app.use(express.json());
app.use(cookieParser());
app.use(cors());

// application routes
app.use("", IndexRoutes);

app.get("/", (req: Request, res: Response) => {
  res.send("Hello from EcoSpark🔥");
});

app.use(notFound);
app.use(globalErrorHandler);

export default app;
