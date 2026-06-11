import fs from "node:fs/promises";
import path from "node:path";
import { loadDanmakuCommentsForEpisode } from "./danmakuCsvLoader.js";
import { normalizeDanmakuMatchKey } from "./danmakuMatcher.js";
import { aggregateDanmakuWindows } from "./danmakuWindowAggregator.js";
import type { DanmakuEpisodeSummary, DanmakuSignalsFile } from "./danmakuTypes.js";

const SIGNALS_DIR = "3.5.danmaku--signals";

export async function generateDanmakuSignalsForEpisode(params: {
  dataRoot: string;
  csvPath: string;
  dramaSlug: string;
  dramaTitle?: string;
  episodeId: string;
  durationSec?: number;
  windowSizeSec?: number;
  windowStepSec?: number;
}) {
  const rawCsvPath = await ensureRawDanmakuCsv({
    dataRoot: params.dataRoot,
    dramaSlug: params.dramaSlug,
    csvPath: params.csvPath
  });
  const { comments, source } = await loadDanmakuCommentsForEpisode(params);
  const windows = aggregateDanmakuWindows({
    episodeId: params.episodeId,
    comments,
    durationSec: params.durationSec,
    windowSizeSec: params.windowSizeSec,
    windowStepSec: params.windowStepSec
  });
  const summary = buildDanmakuEpisodeSummary({
    episodeId: params.episodeId,
    episodeIndex: parseEpisodeIndexFromId(params.episodeId),
    comments,
    windows
  });
  const outDir = getDanmakuSignalEpisodeDir(params.dataRoot, params.dramaSlug, params.episodeId);
  const payload: DanmakuSignalsFile = {
    schema_version: "1.0",
    drama_slug: params.dramaSlug,
    episode_id: params.episodeId,
    episode_index: parseEpisodeIndexFromId(params.episodeId),
    source_csv: rawCsvPath,
    match: {
      drama_names: source.dramaNames,
      normalized_keys: [params.dramaSlug, params.dramaTitle ?? ""]
        .filter(Boolean)
        .map(normalizeDanmakuMatchKey)
    },
    config: {
      window_size_sec: params.windowSizeSec ?? 5,
      window_step_sec: params.windowStepSec ?? 2.5
    },
    quality: {
      danmaku_count: comments.length,
      danmaku_quality: comments.length === 0 ? "none" : comments.length < 20 ? "low" : "normal"
    },
    windows,
    summary
  };

  await fs.mkdir(outDir, { recursive: true });
  await writeJson(path.join(outDir, "danmaku_cleaned.json"), {
    schema_version: "1.0",
    drama_slug: params.dramaSlug,
    episode_id: params.episodeId,
    source,
    comments
  });
  await writeJson(path.join(outDir, "danmaku_windows.json"), {
    schema_version: "1.0",
    drama_slug: params.dramaSlug,
    episode_id: params.episodeId,
    windows
  });
  await writeJson(path.join(outDir, "danmaku_signals.json"), payload);
  await writeJson(path.join(outDir, "danmaku_summary.json"), summary);

  return {
    episodeId: params.episodeId,
    outputDir: outDir,
    matchedRows: source.matchedRows,
    cleanedComments: comments.length,
    windows: windows.length
  };
}

export async function ensureRawDanmakuCsv(params: {
  dataRoot: string;
  dramaSlug: string;
  csvPath: string;
}) {
  const outDir = path.join(params.dataRoot, "1.danmaku--raw", params.dramaSlug);
  const outPath = path.join(outDir, "raw_danmaku.csv");
  await fs.mkdir(outDir, { recursive: true });
  await fs.copyFile(params.csvPath, outPath);
  return outPath;
}

export async function loadDanmakuSignals(params: {
  dataRoot: string;
  dramaSlug: string;
  episodeId: string;
}) {
  const filePath = path.join(
    getDanmakuSignalEpisodeDir(params.dataRoot, params.dramaSlug, params.episodeId),
    "danmaku_signals.json"
  );
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as DanmakuSignalsFile;
  } catch {
    return null;
  }
}

export async function loadDanmakuStorySummary(params: {
  dataRoot: string;
  dramaSlug: string;
  episodeId: string;
}) {
  const filePath = path.join(
    getDanmakuSignalEpisodeDir(params.dataRoot, params.dramaSlug, params.episodeId),
    "danmaku_summary.json"
  );
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as DanmakuEpisodeSummary;
  } catch {
    return null;
  }
}

export function getDanmakuSignalEpisodeDir(dataRoot: string, dramaSlug: string, episodeId: string) {
  return path.join(dataRoot, SIGNALS_DIR, dramaSlug, episodeId);
}

function buildDanmakuEpisodeSummary(params: {
  episodeId: string;
  episodeIndex: number;
  comments: Awaited<ReturnType<typeof loadDanmakuCommentsForEpisode>>["comments"];
  windows: Awaited<ReturnType<typeof aggregateDanmakuWindows>>;
}): DanmakuEpisodeSummary {
  const hotWindows = params.windows
    .filter((window) => window.count > 0)
    .slice()
    .sort((a, b) => b.danmakuSalienceScore - a.danmakuSalienceScore)
    .slice(0, 5)
    .map((window) => ({
      windowId: window.windowId,
      startSec: window.startSec,
      endSec: window.endSec,
      centerSec: window.centerSec,
      danmakuSalienceScore: window.danmakuSalienceScore,
      topKeywords: window.topKeywords,
      emotionDistribution: window.emotionDistribution,
      topComments: window.topComments
    }));
  const emotionTotals = new Map<string, number>();
  for (const comment of params.comments) {
    for (const emotion of comment.emotions) {
      if (emotion === "unknown") continue;
      emotionTotals.set(emotion, (emotionTotals.get(emotion) ?? 0) + 1);
    }
  }

  return {
    episode_id: params.episodeId,
    episode_index: params.episodeIndex,
    total_comments: params.comments.length,
    top_liked_comments: params.comments
      .slice()
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, 10),
    hot_windows: hotWindows,
    episode_emotion_summary: {
      main_emotions: Array.from(emotionTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([emotion]) => emotion as DanmakuEpisodeSummary["episode_emotion_summary"]["main_emotions"][number]),
      high_reaction_ranges: hotWindows.map((window) => `${window.startSec}-${window.endSec}s`)
    }
  };
}

async function writeJson(filePath: string, value: unknown) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseEpisodeIndexFromId(episodeId: string) {
  const match = episodeId.match(/ep_(\d+)/i);
  return match ? Number(match[1]) : 0;
}
