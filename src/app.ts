import express, { Application, Request, Response } from "express";
import cors from "cors";
import { IndexRoutes } from "./app/routes";

const app: Application = express();

// parsers
app.use(express.json());
app.use(cors());

// application routes
app.use("", IndexRoutes);

app.get("/", (req: Request, res: Response) => {
  res.send("Hello from EcoSpark🔥");
});

export default app;
