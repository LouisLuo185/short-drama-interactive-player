import fs from "node:fs/promises";
import path from "node:path";

export type PipelineConfig = {
  asrRoot: string;
  preprocessOutRoot: string;
  highlightOutRoot: string;
  episodeId?: string | null;
  limit?: number | null;
  minScore?: number | null;
  doubao: {
    apiKey: string;
    baseUrl?: string;
    endpointId?: string;
    model?: string;
    jsonMode?: boolean;
  };
};

export async function loadPipelineConfig(configPath: string) {
  const resolvedPath = path.resolve(configPath);
  const raw = await fs.readFile(resolvedPath, "utf8");
  const config = JSON.parse(raw) as PipelineConfig;

  validateConfig(config, resolvedPath);
  applyDoubaoEnvironment(config);

  return config;
}

function validateConfig(config: PipelineConfig, configPath: string) {
  if (!config.asrRoot) {
    throw new Error(`Missing asrRoot in ${configPath}`);
  }

  if (!config.preprocessOutRoot) {
    throw new Error(`Missing preprocessOutRoot in ${configPath}`);
  }

  if (!config.highlightOutRoot) {
    throw new Error(`Missing highlightOutRoot in ${configPath}`);
  }

  if (!config.doubao?.apiKey || config.doubao.apiKey.includes("PASTE_YOUR")) {
    throw new Error(
      `Missing doubao.apiKey in ${configPath}. Copy config.example.json to config.local.json and fill your key.`
    );
  }
}

function applyDoubaoEnvironment(config: PipelineConfig) {
  process.env.ARK_API_KEY = config.doubao.apiKey;

  if (config.doubao.baseUrl) {
    process.env.ARK_BASE_URL = config.doubao.baseUrl;
  }

  const modelOrEndpoint = config.doubao.endpointId || config.doubao.model;
  if (modelOrEndpoint) {
    process.env.ARK_MODEL = modelOrEndpoint;
  }

  if (typeof config.doubao.jsonMode === "boolean") {
    process.env.ARK_JSON_MODE = String(config.doubao.jsonMode);
  }
}
