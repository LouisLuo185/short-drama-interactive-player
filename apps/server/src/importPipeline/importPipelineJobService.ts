import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runSmartImportPipeline } from "./smartImportPipeline.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, "../..");
const repoRoot = path.resolve(serverRoot, "../..");

const defaultWhisperXCommandTemplate =
  "conda run -n whisperx whisperx {audioPath} --output_dir {outputDir} --language zh --compute_type float32";
const defaultCommandTimeoutMinutes = 60;
const defaultHeartbeatSeconds = 30;

export type ImportPipelineJobStatus = "queued" | "running" | "success" | "error";

export type ImportPipelineJob = {
  jobId: string;
  status: ImportPipelineJobStatus;
  sourceDir: string;
  dramaSlug: string;
  title: string;
  configPath?: string;
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
};

type StartImportPipelineJobInput = {
  sourceDir: string;
  dramaSlug: string;
  title: string;
  configPath?: string;
};

const jobs = new Map<string, ImportPipelineJob>();

export function startImportPipelineJob(input: StartImportPipelineJobInput) {
  const sourceDir = path.resolve(input.sourceDir);
  const dramaSlug = input.dramaSlug.trim();
  const title = input.title.trim();

  if (!sourceDir) throw new Error("sourceDir is required");
  if (!dramaSlug) throw new Error("dramaSlug is required");
  if (!title) throw new Error("title is required");

  const activeSameDrama = Array.from(jobs.values()).find(
    (job) => job.dramaSlug === dramaSlug && (job.status === "queued" || job.status === "running")
  );
  if (activeSameDrama) {
    throw new Error(`Import pipeline is already running for ${dramaSlug}: ${activeSameDrama.jobId}`);
  }

  const job: ImportPipelineJob = {
    jobId: createJobId(),
    status: "queued",
    sourceDir,
    dramaSlug,
    title,
    configPath: input.configPath,
    createdAt: new Date().toISOString()
  };
  jobs.set(job.jobId, job);

  void runJob(job);
  return job;
}

export async function getImportPipelineJob(jobId: string) {
  const job = jobs.get(jobId);
  if (!job) return null;

  return {
    ...job,
    report: await readPipelineReport(job)
  };
}

async function runJob(job: ImportPipelineJob) {
  try {
    job.status = "running";
    job.startedAt = new Date().toISOString();

    const config = await loadConfig(job.configPath ?? "tools/asr-highlight-pipeline/config.local.json");
    const result = await runSmartImportPipeline({
      sourceDir: job.sourceDir,
      dramaSlug: job.dramaSlug,
      title: job.title,
      configPath: job.configPath,
      dataRoot: path.join(serverRoot, "data"),
      mediaRoot: path.join(serverRoot, "media"),
      whisperxCommandTemplate:
        config.pipeline?.whisperxCommandTemplate ?? defaultWhisperXCommandTemplate,
      commandTimeoutMs:
        (config.pipeline?.commandTimeoutMinutes ?? defaultCommandTimeoutMinutes) * 60 * 1000,
      heartbeatMs:
        (config.pipeline?.heartbeatSeconds ?? defaultHeartbeatSeconds) * 1000
    });

    job.status = "success";
    job.result = result;
  } catch (error) {
    job.status = "error";
    job.error = error instanceof Error ? error.message : String(error);
  } finally {
    job.finishedAt = new Date().toISOString();
  }
}

async function loadConfig(configPath: string) {
  const resolvedConfigPath = await resolveConfigPath(configPath);
  const raw = JSON.parse(await fs.readFile(resolvedConfigPath, "utf8")) as {
    doubao?: {
      apiKey?: string;
      baseUrl?: string;
      endpointId?: string;
      model?: string;
      jsonMode?: boolean;
    };
    pipeline?: {
      whisperxCommandTemplate?: string;
      commandTimeoutMinutes?: number;
      heartbeatSeconds?: number;
    };
  };

  if (raw.doubao?.apiKey) process.env.ARK_API_KEY = raw.doubao.apiKey;
  if (raw.doubao?.baseUrl) process.env.ARK_BASE_URL = raw.doubao.baseUrl;
  if (raw.doubao?.endpointId || raw.doubao?.model) {
    process.env.ARK_MODEL = raw.doubao.endpointId ?? raw.doubao.model;
  }
  if (typeof raw.doubao?.jsonMode === "boolean") {
    process.env.ARK_JSON_MODE = String(raw.doubao.jsonMode);
  }

  return raw;
}

async function resolveConfigPath(configPath: string) {
  const candidates = [
    path.resolve(configPath),
    path.resolve(repoRoot, configPath),
    path.resolve(serverRoot, configPath)
  ];

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) return candidate;
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error(`Config file not found: ${configPath}`);
}

async function readPipelineReport(job: ImportPipelineJob) {
  const reportPath = job.result?.reportPath ?? path.join(
    serverRoot,
    "data",
    "0.source",
    job.dramaSlug,
    "pipeline_report.json"
  );

  try {
    return JSON.parse(await fs.readFile(reportPath, "utf8")) as unknown;
  } catch {
    return null;
  }
}

function createJobId() {
  return `import_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
