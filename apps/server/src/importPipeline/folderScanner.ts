import fs from "node:fs/promises";
import path from "node:path";
import type { SmartImportEpisode } from "./types.js";
import { probeVideo } from "../services/videoOcr/videoProbe.js";

const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".m4v", ".webm", ".mkv"]);

export async function scanDramaFolder(params: {
  sourceDir: string;
  mediaRoot: string;
  dramaSlug: string;
}) {
  const entries = await fs.readdir(params.sourceDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => entry.name)
    .sort(naturalCompare);

  if (files.length === 0) {
    throw new Error(`No video files found in source folder: ${params.sourceDir}`);
  }

  const episodes: SmartImportEpisode[] = [];
  for (const [index, fileName] of files.entries()) {
    const episodeNo = index + 1;
    const episodeId = toEpisodeId(episodeNo);
    const sourceFilePath = path.join(params.sourceDir, fileName);
    const videoFileName = `${episodeId}.mp4`;
    const videoPath = path.join(params.mediaRoot, "videos", params.dramaSlug, videoFileName);
    const videoUrl = `/media/videos/${params.dramaSlug}/${videoFileName}`;
    const durationSec = await probeDuration(sourceFilePath);

    episodes.push({
      episodeNo,
      episodeId,
      title: `第${episodeNo}集 ${episodeId}`,
      sourceFilePath,
      sourceFileName: fileName,
      videoFileName,
      videoPath,
      videoUrl,
      durationSec
    });
  }

  return episodes;
}

export function toEpisodeId(episodeNo: number) {
  return `ep_${String(episodeNo).padStart(3, "0")}`;
}

async function probeDuration(filePath: string) {
  try {
    const info = await probeVideo(filePath);
    return Math.round(info.duration * 1000) / 1000;
  } catch {
    return 1;
  }
}

function naturalCompare(left: string, right: string) {
  return left.localeCompare(right, "zh-Hans-CN", {
    numeric: true,
    sensitivity: "base"
  });
}
