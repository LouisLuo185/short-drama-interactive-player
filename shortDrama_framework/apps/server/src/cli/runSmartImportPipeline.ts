import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runSmartImportPipeline } from "../importPipeline/smartImportPipeline.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, "../..");
const defaultWhisperXCommandTemplate =
  "conda run -n whisperx whisperx {audioPath} --output_dir {outputDir} --language zh --compute_type float32";
const defaultCommandTimeoutMinutes = 60;
const defaultHeartbeatSeconds = 30;

type CliOptions = {
  source?: string;
  dramaSlug?: string;
  title?: string;
  config?: string;
  dataRoot: string;
  mediaRoot: string;
  whisperxCommandTemplate?: string;
  commandTimeoutMinutes?: number;
  heartbeatSeconds?: number;
  episodeIds?: string[];
  skipCopy?: boolean;
  skipDatabase?: boolean;
  skipFfmpeg?: boolean;
  skipWhisperX?: boolean;
  skipRefine?: boolean;
  skipStoryContext?: boolean;
  skipMetadata?: boolean;
  skipHighlight?: boolean;
  maxStorySentencesPerEpisode?: number;
};

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const config = await loadConfigIfNeeded(options.config);

  if (!options.source) throw new Error("--source is required");
  if (!options.dramaSlug) throw new Error("--drama-slug is required");
  if (!options.title) throw new Error("--title is required");

  const result = await runSmartImportPipeline({
    sourceDir: path.resolve(options.source),
    dramaSlug: options.dramaSlug,
    title: options.title,
    configPath: options.config,
    dataRoot: options.dataRoot,
    mediaRoot: options.mediaRoot,
    whisperxCommandTemplate:
      options.whisperxCommandTemplate ??
      config.pipeline?.whisperxCommandTemplate ??
      defaultWhisperXCommandTemplate,
    commandTimeoutMs:
      (options.commandTimeoutMinutes ??
        config.pipeline?.commandTimeoutMinutes ??
        defaultCommandTimeoutMinutes) * 60 * 1000,
    heartbeatMs:
      (options.heartbeatSeconds ??
        config.pipeline?.heartbeatSeconds ??
        defaultHeartbeatSeconds) * 1000,
    episodeIds: options.episodeIds,
    skipCopy: options.skipCopy,
    skipDatabase: options.skipDatabase,
    skipFfmpeg: options.skipFfmpeg,
    skipWhisperX: options.skipWhisperX,
    skipRefine: options.skipRefine,
    skipStoryContext: options.skipStoryContext,
    skipMetadata: options.skipMetadata,
    skipHighlight: options.skipHighlight,
    maxStorySentencesPerEpisode: options.maxStorySentencesPerEpisode
  });

  console.log(JSON.stringify({ status: "ok", ...result }, null, 2));
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    dataRoot: path.join(serverRoot, "data"),
    mediaRoot: path.join(serverRoot, "media")
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    switch (arg) {
      case "--source":
        options.source = requireValue(arg, next);
        index += 1;
        break;
      case "--drama-slug":
        options.dramaSlug = requireValue(arg, next);
        index += 1;
        break;
      case "--title":
        options.title = requireValue(arg, next);
        index += 1;
        break;
      case "--config":
        options.config = requireValue(arg, next);
        index += 1;
        break;
      case "--data-root":
        options.dataRoot = path.resolve(requireValue(arg, next));
        index += 1;
        break;
      case "--media-root":
        options.mediaRoot = path.resolve(requireValue(arg, next));
        index += 1;
        break;
      case "--whisperx-command-template":
        options.whisperxCommandTemplate = requireValue(arg, next);
        index += 1;
        break;
      case "--command-timeout-minutes":
        options.commandTimeoutMinutes = requirePositiveNumber(arg, next);
        index += 1;
        break;
      case "--heartbeat-seconds":
        options.heartbeatSeconds = requirePositiveNumber(arg, next);
        index += 1;
        break;
      case "--episode-ids":
        options.episodeIds = requireValue(arg, next)
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
        index += 1;
        break;
      case "--max-story-sentences-per-episode":
        options.maxStorySentencesPerEpisode = Number(requireValue(arg, next));
        index += 1;
        break;
      case "--skip-copy":
        options.skipCopy = true;
        break;
      case "--skip-database":
        options.skipDatabase = true;
        break;
      case "--skip-ffmpeg":
        options.skipFfmpeg = true;
        break;
      case "--skip-whisperx":
        options.skipWhisperX = true;
        break;
      case "--skip-refine":
        options.skipRefine = true;
        break;
      case "--skip-story-context":
        options.skipStoryContext = true;
        break;
      case "--skip-metadata":
        options.skipMetadata = true;
        break;
      case "--skip-highlight":
        options.skipHighlight = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

async function loadConfigIfNeeded(configPath?: string) {
  if (!configPath) return {};

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
    path.resolve(serverRoot, "../..", configPath)
  ];

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) return candidate;
    } catch {
      // Try the next config path.
    }
  }

  throw new Error(`Config file not found: ${configPath}`);
}

function requireValue(name: string, value?: string) {
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value`);
  }

  return value;
}

function requirePositiveNumber(name: string, value?: string) {
  const raw = requireValue(name, value);
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} requires a positive number`);
  }

  return parsed;
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ERROR] ${message}`);
  process.exitCode = 1;
});
