import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateDanmakuSignalsForEpisode } from "../danmaku/danmakuSignalService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, "../..");

type CliOptions = {
  csv?: string;
  dataRoot: string;
  dramaSlug?: string;
  dramaTitle?: string;
  episodeIds?: string[];
  durationSec?: number;
  windowSizeSec?: number;
  windowStepSec?: number;
};

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.csv) throw new Error("--csv is required");
  if (!options.dramaSlug) throw new Error("--drama-slug is required");

  const episodeIds =
    options.episodeIds && options.episodeIds.length > 0
      ? options.episodeIds
      : await listEpisodeIds(options.dataRoot, options.dramaSlug);
  const results = [];

  for (const episodeId of episodeIds) {
    results.push(
      await generateDanmakuSignalsForEpisode({
        dataRoot: options.dataRoot,
        csvPath: path.resolve(options.csv),
        dramaSlug: options.dramaSlug,
        dramaTitle: options.dramaTitle,
        episodeId,
        durationSec: options.durationSec,
        windowSizeSec: options.windowSizeSec,
        windowStepSec: options.windowStepSec
      })
    );
  }

  console.log(
    JSON.stringify(
      {
        status: "ok",
        dramaSlug: options.dramaSlug,
        episodes: episodeIds,
        results
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
      case "--csv":
        options.csv = requireValue(arg, next);
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
      case "--drama-title":
      case "--title":
        options.dramaTitle = requireValue(arg, next);
        index += 1;
        break;
      case "--episode-id":
        options.episodeIds = [requireValue(arg, next)];
        index += 1;
        break;
      case "--episode-ids":
        options.episodeIds = requireValue(arg, next)
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
        index += 1;
        break;
      case "--duration-sec":
        options.durationSec = Number(requireValue(arg, next));
        index += 1;
        break;
      case "--window-size-sec":
        options.windowSizeSec = Number(requireValue(arg, next));
        index += 1;
        break;
      case "--window-step-sec":
        options.windowStepSec = Number(requireValue(arg, next));
        index += 1;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

async function listEpisodeIds(dataRoot: string, dramaSlug: string) {
  const candidateDirs = [
    path.join(dataRoot, "3.doubao--llm_preprocess", dramaSlug),
    path.join(dataRoot, "2.whisperX--asr", dramaSlug)
  ];

  for (const dir of candidateDirs) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isDirectory() && entry.name.startsWith("ep_"))
        .map((entry) => entry.name)
        .sort();
    } catch {
      // Try next source directory.
    }
  }

  throw new Error(`No episode folders found for dramaSlug: ${dramaSlug}`);
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

