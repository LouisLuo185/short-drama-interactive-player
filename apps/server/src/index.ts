import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyticsRouter } from "./routes/analyticsRoutes.js";
import { adminRouter } from "./routes/adminRoutes.js";
import { dramaRouter } from "./routes/dramaRoutes.js";
import { episodeRouter } from "./routes/episodeRoutes.js";
import { highlightRouter } from "./routes/highlightRoutes.js";
import { llmHighlightRouter } from "./routes/llmHighlightRoutes.js";
import { initializeDatabase } from "./db/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT ?? 3001);
const mediaRoot = path.resolve(__dirname, "../media");

initializeDatabase();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/media", express.static(mediaRoot));

app.get("/api/health", (_req, res) => {
  res.json({
    data: {
      status: "ok",
      service: "short-drama-server"
    }
  });
});

app.use("/api/dramas", dramaRouter);
app.use("/api/episodes", llmHighlightRouter);
app.use("/api/episodes", episodeRouter);
app.use("/api/episodes", highlightRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/admin", adminRouter);

app.listen(port, () => {
  console.log(`Short drama server listening at http://localhost:${port}`);
});
