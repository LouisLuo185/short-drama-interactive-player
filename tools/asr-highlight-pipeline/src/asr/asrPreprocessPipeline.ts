import fs from "node:fs/promises";
import path from "node:path";
import {
  findWhisperXJsonFiles,
  getEpisodeIdFromFile,
  loadWhisperXJson
} from "./asrLoader.js";
import { normalizeWhisperXSegments } from "./asrNormalizer.js";
import { buildHighlightWindows } from "./asrWindowBuilder.js";
import type { PreprocessEpisodeResult } from "../types.js";

export type PreprocessOptions = {
  asrRoot: string;
  outRoot: string;
  episodeId?: string;
};

export async function runAsrPreprocessPipeline(options: PreprocessOptions) {
  const asrFiles = await resolveInputFiles(options);
  const outRoot = path.resolve(options.outRoot);
  const episodes: PreprocessEpisodeResult[] = [];

  await fs.mkdir(outRoot, { recursive: true });

  for (const filePath of asrFiles) {
    const episodeId = getEpisodeIdFromFile(filePath);
    const raw = await loadWhisperXJson(filePath);
    const segments = normalizeWhisperXSegments(episodeId, raw.segments ?? []);
    const windows = buildHighlightWindows(segments);
    const episodeOutDir = path.join(outRoot, episodeId);

    await fs.mkdir(episodeOutDir, { recursive: true });
    await writeJson(path.join(episodeOutDir, "segments.json"), {
      episode_id: episodeId,
      source: "whisperx",
      segments
    });
    await writeJson(path.join(episodeOutDir, "highlight_windows.json"), {
      episode_id: episodeId,
      source: "whisperx",
      windows
    });

    episodes.push({
      episode_id: episodeId,
      segment_count: segments.length,
      window_count: windows.length,
      duration_sec: segments.at(-1)?.end ?? 0,
      segments_path: toPortablePath(path.join(episodeOutDir, "segments.json")),
      highlight_windows_path: toPortablePath(path.join(episodeOutDir, "highlight_windows.json"))
    });
  }

  const manifest = {
    source_root: path.resolve(options.asrRoot),
    generated_at: new Date().toISOString(),
    episodes
  };
  await writeJson(path.join(outRoot, "manifest.json"), manifest);

  return manifest;
}

async function resolveInputFiles(options: PreprocessOptions) {
  if (options.episodeId) {
    const filePath = path.resolve(
      options.asrRoot,
      options.episodeId,
      `${options.episodeId}.json`
    );
    return [filePath];
  }

  return findWhisperXJsonFiles(options.asrRoot);
}

async function writeJson(filePath: string, value: unknown) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function toPortablePath(filePath: string) {
  return filePath.replaceAll("\\", "/");
}
