import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureRawCopies, loadWhisperXEpisode } from "../asr/whisperxLoader.js";
import { refineEpisodeSentenceTimeline } from "../asr/sentenceTimelineRefiner.js";
import { analyzeRefinedEpisodeHighlights } from "../highlights/refinedHighlightAnalyzer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, "../..");

type CliOptions = {
  config?: string;
  dataRoot: string;
  dramaSlug?: string;
  episodeId?: string;
  limitSegments?: number;
  limitWindows?: number;
  skipRefine?: boolean;
  skipAnalyze?: boolean;
};

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await loadConfigIfNeeded(options.config);

  if (!options.dramaSlug) {
    throw new Error("--drama-slug is required");
  }

  const episodeIds = options.episodeId
    ? [options.episodeId]
    : await listEpisodeIds(options.dataRoot, options.dramaSlug);
  const refineResults = [];
  const highlightResults = [];

  for (const episodeId of episodeIds) {
    const episode = await loadWhisperXEpisode({
      dataRoot: options.dataRoot,
      dramaSlug: options.dramaSlug,
      episodeId
    });

    await ensureRawCopies(episode, options.dataRoot);

    if (!options.skipRefine) {
      const refined = await refineEpisodeSentenceTimeline({
        episode,
        dataRoot: options.dataRoot,
        limitSegments: options.limitSegments
      });

      refineResults.push({
        episode_id: episodeId,
        sentence_count: refined.sentences.length,
        time_source: refined.source.time_source,
        refined_sentences_path: path.join(
          options.dataRoot,
          "3.doubao--llm_preprocess",
          options.dramaSlug,
          episodeId,
          "refined_sentences.json"
        ),
        refined_srt_path: path.join(
          options.dataRoot,
          "3.doubao--llm_preprocess",
          options.dramaSlug,
          episodeId,
          "refined.srt"
        )
      });
    }

    if (!options.skipAnalyze) {
      const summary = await analyzeRefinedEpisodeHighlights({
        dataRoot: options.dataRoot,
        dramaSlug: options.dramaSlug,
        episodeId,
        limitWindows: options.limitWindows
      });
      highlightResults.push(summary);
    }
  }

  console.log(
    JSON.stringify(
      {
        status: "ok",
        dramaSlug: options.dramaSlug,
        episodes: episodeIds,
        refine: {
          skipped: Boolean(options.skipRefine),
          results: refineResults
        },
        analyze: {
          skipped: Boolean(options.skipAnalyze),
          results: highlightResults
        }
      },
      null,
      2
    )
  );
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
      case "--episode-id":
        options.episodeId = requireValue(arg, next);
        index += 1;
        break;
      case "--limit-segments":
        options.limitSegments = Number(requireValue(arg, next));
        index += 1;
        break;
      case "--limit-windows":
        options.limitWindows = Number(requireValue(arg, next));
        index += 1;
        break;
      case "--skip-refine":
        options.skipRefine = true;
        break;
      case "--skip-analyze":
        options.skipAnalyze = true;
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
      if (stat.isFile()) {
        return candidate;
      }
    } catch {
      // Try the next path candidate.
    }
  }

  throw new Error(`Config file not found: ${configPath}`);
}

async function listEpisodeIds(dataRoot: string, dramaSlug: string) {
  const dramaDir = path.join(dataRoot, "2.whisperX--asr", dramaSlug);
  const entries = await fs.readdir(dramaDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("ep_"))
    .map((entry) => entry.name)
    .sort();
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
