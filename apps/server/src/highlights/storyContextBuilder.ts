import fs from "node:fs/promises";
import path from "node:path";
import { callDoubao } from "../llm/doubaoClient.js";
import type { RefinedSentencesFile } from "../asr/types.js";
import { buildDanmakuStoryContextForEpisode } from "./danmakuStoryContextBuilder.js";
import {
  buildStoryContextMessages,
  type EpisodeStoryInput
} from "./storyContextPrompt.js";

export type BuildStoryContextOptions = {
  dataRoot: string;
  dramaSlug: string;
  episodeIds?: string[];
  maxSentencesPerEpisode?: number;
};

export async function buildStoryContext(options: BuildStoryContextOptions) {
  const episodeIds =
    options.episodeIds && options.episodeIds.length > 0
      ? options.episodeIds
      : await listPreprocessEpisodeIds(options.dataRoot, options.dramaSlug);
  const episodes = await Promise.all(
    episodeIds.map((episodeId) =>
      loadEpisodeStoryInput({
        dataRoot: options.dataRoot,
        dramaSlug: options.dramaSlug,
        episodeId,
        maxSentences: options.maxSentencesPerEpisode ?? 80
      })
    )
  );

  const raw = await callDoubao(
    buildStoryContextMessages({
      dramaSlug: options.dramaSlug,
      episodes
    }),
    {
      temperature: 0.15,
      maxTokens: 5000
    }
  );
  const parsed = parseJsonObject(raw);
  if (!parsed) {
    throw new Error("Story context model output is not valid JSON.");
  }

  const outDir = path.join(options.dataRoot, "3.5.doubao--story_context", options.dramaSlug);
  await fs.mkdir(outDir, { recursive: true });
  await writeJson(path.join(outDir, "drama_context.json"), getRecord(parsed.drama_context));
  await writeJson(path.join(outDir, "character_map.json"), getRecord(parsed.character_map));
  await writeJson(path.join(outDir, "episode_summaries.json"), getRecord(parsed.episode_summaries));
  await writeJson(
    path.join(outDir, "danmaku_signals.json"),
    getRecord(parsed.danmaku_signals ?? parsed.danmu_signals, { episodes: [] })
  );
  await fs.writeFile(path.join(outDir, "raw_response.json"), `${raw}\n`, "utf8");

  const summary = {
    dramaSlug: options.dramaSlug,
    episodes: episodeIds,
    outputDir: outDir,
    files: [
      "drama_context.json",
      "character_map.json",
      "episode_summaries.json",
      "danmaku_signals.json",
      "raw_response.json"
    ]
  };
  await writeJson(path.join(outDir, "summary.json"), summary);

  return summary;
}

async function listPreprocessEpisodeIds(dataRoot: string, dramaSlug: string) {
  const dramaDir = path.join(dataRoot, "3.doubao--llm_preprocess", dramaSlug);
  const entries = await fs.readdir(dramaDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("ep_"))
    .map((entry) => entry.name)
    .sort();
}

async function loadEpisodeStoryInput(params: {
  dataRoot: string;
  dramaSlug: string;
  episodeId: string;
  maxSentences: number;
}): Promise<EpisodeStoryInput> {
  const filePath = path.join(
    params.dataRoot,
    "3.doubao--llm_preprocess",
    params.dramaSlug,
    params.episodeId,
    "refined_sentences.json"
  );
  const refined = JSON.parse(await fs.readFile(filePath, "utf8")) as RefinedSentencesFile;
  const danmakuStoryContext = await buildDanmakuStoryContextForEpisode({
    dataRoot: params.dataRoot,
    dramaSlug: params.dramaSlug,
    episodeId: params.episodeId
  });

  return {
    episode_id: params.episodeId,
    episode_no: parseEpisodeNo(params.episodeId) ?? 0,
    danmaku_story_context: danmakuStoryContext,
    sentences: refined.sentences.slice(0, params.maxSentences).map((sentence) => ({
      sentence_id: sentence.sentence_id,
      start: sentence.start,
      end: sentence.end,
      text: sentence.text,
      sentence_type: sentence.sentence_type
    }))
  };
}

function parseJsonObject(raw: string) {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

function getRecord(value: unknown, fallback: Record<string, unknown> = {}) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : fallback;
}

async function writeJson(filePath: string, value: unknown) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseEpisodeNo(episodeId: string) {
  const match = episodeId.match(/ep_(\d+)/i);
  if (!match) return null;

  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}
