import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildStoryContext } from "../highlights/storyContextBuilder.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, "../..");

type CliOptions = {
  config?: string;
  dataRoot: string;
  dramaSlug?: string;
  episodeIds?: string[];
  maxSentencesPerEpisode?: number;
};

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await loadConfigIfNeeded(options.config);

  if (!options.dramaSlug) {
    throw new Error("--drama-slug is required");
  }

  const summary = await buildStoryContext({
    dataRoot: options.dataRoot,
    dramaSlug: options.dramaSlug,
    episodeIds: options.episodeIds,
    maxSentencesPerEpisode: options.maxSentencesPerEpisode
  });

  console.log(JSON.stringify({ status: "ok", ...summary }, null, 2));
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    dataRoot: path.join(serverRoot, "data")
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    switch (arg) {
      case "--config":
        options.config = requireValue(arg, next);
        index += 1;
        break;
      case "--data-root":
        options.dataRoot = path.resolve(requireValue(arg, next));
        index += 1;
        break;
      case "--drama-slug":
        options.dramaSlug = requireValue(arg, next);
        index += 1;
        break;
      case "--episode-ids":
        options.episodeIds = requireValue(arg, next)
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
        index += 1;
        break;
      case "--max-sentences-per-episode":
        options.maxSentencesPerEpisode = Number(requireValue(arg, next));
        index += 1;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

async function loadConfigIfNeeded(configPath?: string) {
  if (!configPath) return;

  const resolvedConfigPath = await resolveConfigPath(configPath);
  const raw = JSON.parse(await fs.readFile(resolvedConfigPath, "utf8")) as {
    doubao?: {
      apiKey?: string;
      baseUrl?: string;
      endpointId?: string;
      model?: string;
      jsonMode?: boolean;
    };
  };

  if (raw.doubao?.apiKey) {
    process.env.ARK_API_KEY = raw.doubao.apiKey;
  }
  if (raw.doubao?.baseUrl) {
    process.env.ARK_BASE_URL = raw.doubao.baseUrl;
  }
  if (raw.doubao?.endpointId || raw.doubao?.model) {
    process.env.ARK_MODEL = raw.doubao.endpointId ?? raw.doubao.model;
  }
  if (typeof raw.doubao?.jsonMode === "boolean") {
    process.env.ARK_JSON_MODE = String(raw.doubao.jsonMode);
  }
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
      // Try the next candidate.
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

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ERROR] ${message}`);
  process.exitCode = 1;
});
