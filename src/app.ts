import express, { Application, Request, Response } from "express";
import cors from "cors";
import { IndexRoutes } from "./app/routes";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./app/lib/auth";
import path from "path";
import cookieParser from "cookie-parser";

const app: Application = express();
app.use("/api/auth", toNodeHandler(auth));
app.set("view engine", "ejs"); // Set the views directory to the absolute path of src/app/templates
app.set("views", path.resolve(process.cwd(), `src/app/templates`));

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

export default app;
