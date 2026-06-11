import { Router } from "express";
import { importDrama } from "../services/adminImportService.js";
import {
  getImportPipelineJob,
  startImportPipelineJob
} from "../importPipeline/importPipelineJobService.js";

export const adminRouter = Router();

adminRouter.post("/dramas/import", (req, res) => {
  try {
    const result = importDrama(req.body);
    res.status(201).json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    res.status(400).json({ data: null, error: message });
  }
});

adminRouter.post("/import-pipeline/jobs", (req, res) => {
  try {
    const job = startImportPipelineJob({
      sourceDir: req.body?.sourceDir,
      dramaSlug: req.body?.dramaSlug,
      title: req.body?.title,
      configPath: req.body?.configPath
    });

    res.status(202).json({ data: job });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    res.status(400).json({ data: null, error: message });
  }
});

adminRouter.get("/import-pipeline/jobs/:jobId", async (req, res) => {
  try {
    const job = await getImportPipelineJob(req.params.jobId);
    if (!job) {
      res.status(404).json({ data: null, error: "IMPORT_PIPELINE_JOB_NOT_FOUND" });
      return;
    }

    res.json({ data: job });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    res.status(500).json({ data: null, error: message });
  }
});
