import { getJson, postJson } from "./http";
import type { ImportDramaInput, ImportDramaResult } from "../types/adminImport";

export function importDrama(payload: ImportDramaInput) {
  return postJson<ImportDramaResult>("/api/admin/dramas/import", payload);
}

export type ImportPipelineJob = {
  jobId: string;
  status: "queued" | "running" | "success" | "error";
  sourceDir: string;
  dramaSlug: string;
  title: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  result?: {
    dramaSlug: string;
    dramaId?: string;
    episodeIds: string[];
    manifestPath: string;
    reportPath: string;
  };
  report?: {
    steps?: Array<{
      step: string;
      status: "pending" | "skipped" | "success" | "error";
      message?: string;
      startedAt?: string;
      finishedAt?: string;
    }>;
  } | null;
};

export function startImportPipelineJob(payload: {
  sourceDir: string;
  dramaSlug: string;
  title: string;
  configPath?: string;
}) {
  return postJson<ImportPipelineJob>("/api/admin/import-pipeline/jobs", payload);
}

export function fetchImportPipelineJob(jobId: string) {
  return getJson<ImportPipelineJob>(`/api/admin/import-pipeline/jobs/${jobId}`);
}
