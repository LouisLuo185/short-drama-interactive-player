import fs from "node:fs/promises";
import path from "node:path";
import { loadDanmakuStorySummary } from "../danmaku/danmakuSignalService.js";

export type StoryContext = {
  drama_context?: unknown;
  character_map?: unknown;
  episode_summaries?: unknown;
  danmaku_signals?: unknown;
  loaded_files: string[];
};

const STORY_CONTEXT_DIR = "3.5.doubao--story_context";

export async function loadStoryContext(params: {
  dataRoot: string;
  dramaSlug: string;
  episodeId: string;
}): Promise<StoryContext> {
  const contextDir = path.join(params.dataRoot, STORY_CONTEXT_DIR, params.dramaSlug);
  const [dramaContext, characterMap, episodeSummaries, danmakuSignals, legacyDanmuSignals] = await Promise.all([
    readOptionalJson(path.join(contextDir, "drama_context.json")),
    readOptionalJson(path.join(contextDir, "character_map.json")),
    readOptionalJson(path.join(contextDir, "episode_summaries.json")),
    readOptionalJson(path.join(contextDir, "danmaku_signals.json")),
    readOptionalJson(path.join(contextDir, "danmu_signals.json"))
  ]);
  const danmakuSummary = await loadDanmakuStorySummary(params);

  return {
    drama_context: dramaContext.value,
    character_map: characterMap.value,
    episode_summaries: selectEpisodeContext(episodeSummaries.value, params.episodeId),
    danmaku_signals:
      danmakuSummary ??
      selectEpisodeContext(danmakuSignals.value ?? legacyDanmuSignals.value, params.episodeId),
    loaded_files: [
      dramaContext.file,
      characterMap.file,
      episodeSummaries.file,
      danmakuSignals.file ?? legacyDanmuSignals.file,
      danmakuSummary
        ? path.join(
            params.dataRoot,
            "3.5.danmaku--signals",
            params.dramaSlug,
            params.episodeId,
            "danmaku_summary.json"
          )
        : undefined
    ].filter((file): file is string => Boolean(file))
  };
}

export function serializeStoryContextForPrompt(context: StoryContext) {
  const compact = {
    drama_context: context.drama_context ?? null,
    character_map: context.character_map ?? null,
    episode_summaries: context.episode_summaries ?? null,
    danmaku_signals: context.danmaku_signals ?? null
  };

  return JSON.stringify(compact, null, 2);
}

async function readOptionalJson(filePath: string) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return { value: JSON.parse(raw) as unknown, file: filePath };
  } catch {
    return { value: undefined, file: undefined };
  }
}

function selectEpisodeContext(value: unknown, episodeId: string) {
  if (!value || typeof value !== "object") return value;

  const record = value as Record<string, unknown>;
  const currentEpisodeNo = parseEpisodeNo(episodeId);
  if (!currentEpisodeNo) return value;

  if (Array.isArray(record.episodes)) {
    return {
      ...record,
      episodes: record.episodes.filter((episode) => {
        if (!episode || typeof episode !== "object") return false;
        const episodeRecord = episode as Record<string, unknown>;
        const id = String(episodeRecord.episode_id ?? episodeRecord.episodeId ?? "");
        const no = Number(episodeRecord.episode_no ?? episodeRecord.episodeNo);

        return id === episodeId || (Number.isFinite(no) && no <= currentEpisodeNo);
      })
    };
  }

  return value;
}

function parseEpisodeNo(episodeId: string) {
  const match = episodeId.match(/ep_(\d+)/i);
  if (!match) return null;

  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}
