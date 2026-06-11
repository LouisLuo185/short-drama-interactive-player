import fs from "node:fs/promises";
import path from "node:path";
import type { WhisperXEpisode, WhisperXSegment } from "./types.js";

export async function loadWhisperXEpisode(params: {
  dataRoot: string;
  dramaSlug: string;
  episodeId: string;
}): Promise<WhisperXEpisode> {
  const episodeDir = path.join(params.dataRoot, "2.whisperX--asr", params.dramaSlug, params.episodeId);
  const sourceJsonPath = await findExistingFile([
    path.join(episodeDir, "raw_whisperx.json"),
    path.join(episodeDir, `${params.episodeId}.json`),
    path.join(episodeDir, "segments.json")
  ]);
  const sourceSrtPath = await findExistingFile([
    path.join(episodeDir, "raw.srt"),
    path.join(episodeDir, `${params.episodeId}.srt`)
  ]);

  if (!sourceJsonPath) {
    throw new Error(`WhisperX JSON not found: ${episodeDir}`);
  }

  const raw = JSON.parse(await fs.readFile(sourceJsonPath, "utf8")) as {
    segments?: Array<WhisperXSegment & {
      segment_id?: string;
      raw_text?: string;
      clean_text?: string;
    }>;
  };

  if (!Array.isArray(raw.segments)) {
    throw new Error(`Invalid WhisperX JSON, segments missing: ${sourceJsonPath}`);
  }

  return {
    episodeId: params.episodeId,
    dramaSlug: params.dramaSlug,
    sourceJsonPath,
    sourceSrtPath: sourceSrtPath ?? undefined,
    segments: raw.segments.map((segment, index) => ({
      start: segment.start,
      end: segment.end,
      text: segment.text ?? segment.clean_text ?? segment.raw_text ?? "",
      words: segment.words,
      id:
        segment.id ??
        segment.segment_id ??
        `${params.episodeId}_seg_${String(index + 1).padStart(3, "0")}`
    }))
  };
}

export async function ensureRawCopies(episode: WhisperXEpisode, dataRoot: string) {
  const episodeDir = path.join(dataRoot, "2.whisperX--asr", episode.dramaSlug, episode.episodeId);
  await fs.mkdir(episodeDir, { recursive: true });
  await copyIfDifferent(episode.sourceJsonPath, path.join(episodeDir, "raw_whisperx.json"));

  if (episode.sourceSrtPath) {
    await copyIfDifferent(episode.sourceSrtPath, path.join(episodeDir, "raw.srt"));
  }
}

async function copyIfDifferent(source: string, target: string) {
  if (path.resolve(source) === path.resolve(target)) {
    return;
  }

  await fs.copyFile(source, target);
}

async function findExistingFile(files: string[]) {
  for (const file of files) {
    try {
      const stat = await fs.stat(file);
      if (stat.isFile()) return file;
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}
