import fs from "node:fs/promises";
import { cleanDanmakuText, isValidDanmakuText } from "./danmakuCleaner.js";
import { detectDanmakuEmotions, extractDanmakuKeywords } from "./danmakuEmotionLexicon.js";
import {
  episodeIdFromIndex,
  isDramaNameMatch,
  parseEpisodeIndex
} from "./danmakuMatcher.js";
import type { DanmakuComment, RawDanmakuRow } from "./danmakuTypes.js";

const FIELD_ALIASES = {
  dramaName: ["剧名称", "剧名", "drama", "drama_name", "dramaName"],
  episodeIndex: ["group_title", "集数", "episode", "episode_index", "episodeIndex"],
  timeMs: [
    "发弹幕时刻相对于视频起始时间偏移量",
    "弹幕时间",
    "time",
    "time_ms",
    "timestamp"
  ],
  likeCount: ["累计点赞数", "点赞数", "likes", "like_count", "likeCount"],
  content: ["弹幕内容", "content", "text", "danmaku"]
} as const;

export async function loadDanmakuCommentsForEpisode(params: {
  csvPath: string;
  dramaSlug: string;
  dramaTitle?: string;
  episodeId: string;
  durationSec?: number;
}) {
  const text = await readCsvText(params.csvPath);
  const rows = parseCsv(text).map(toRawDanmakuRow).filter(Boolean) as RawDanmakuRow[];
  const episodeIndex = parseEpisodeIndex(params.episodeId);
  const dramaCandidates = [params.dramaSlug, params.dramaTitle ?? ""].filter(Boolean);
  const matchedRows = rows.filter(
    (row) =>
      row.episodeIndex === episodeIndex &&
      isDramaNameMatch(row.dramaName, dramaCandidates)
  );

  const comments: DanmakuComment[] = [];
  let skippedOutOfRange = 0;
  let skippedInvalidText = 0;

  for (const [index, row] of matchedRows.entries()) {
    const cleaned = cleanDanmakuText(row.content);
    if (!isValidDanmakuText(cleaned)) {
      skippedInvalidText += 1;
      continue;
    }

    const timeSec = normalizeTimeSec(row.timeMs, params.durationSec);
    if (params.durationSec && (timeSec < 0 || timeSec > params.durationSec + 2)) {
      skippedOutOfRange += 1;
      continue;
    }

    comments.push({
      id: `${params.episodeId}_danmaku_${String(index + 1).padStart(6, "0")}`,
      dramaName: row.dramaName,
      episodeIndex: row.episodeIndex,
      episodeId: params.episodeId,
      timeSec,
      likeCount: Math.max(0, row.likeCount),
      content: cleaned,
      emotions: detectDanmakuEmotions(cleaned),
      keywords: extractDanmakuKeywords(cleaned)
    });
  }

  return {
    comments: comments.sort((a, b) => a.timeSec - b.timeSec),
    source: {
      totalRows: rows.length,
      matchedRows: matchedRows.length,
      skippedInvalidText,
      skippedOutOfRange,
      dramaNames: Array.from(new Set(matchedRows.map((row) => row.dramaName)))
    }
  };
}

async function readCsvText(csvPath: string) {
  const bytes = await fs.readFile(csvPath);
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (!utf8.includes("�") && /剧名称|弹幕内容|累计点赞数/.test(utf8.slice(0, 300))) {
    return utf8;
  }

  return new TextDecoder("gb18030").decode(bytes);
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        cell += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);

  const [headers = [], ...dataRows] = rows;
  return dataRows.map((values) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header.trim()] = values[index]?.trim() ?? "";
    });
    return record;
  });
}

function toRawDanmakuRow(record: Record<string, string>): RawDanmakuRow | null {
  const dramaName = getAliasedField(record, FIELD_ALIASES.dramaName);
  const episodeValue = getAliasedField(record, FIELD_ALIASES.episodeIndex);
  const timeValue = getAliasedField(record, FIELD_ALIASES.timeMs);
  const likeValue = getAliasedField(record, FIELD_ALIASES.likeCount);
  const content = getAliasedField(record, FIELD_ALIASES.content);

  if (!dramaName || !episodeValue || !timeValue || !content) return null;

  return {
    dramaName,
    episodeIndex: parseEpisodeIndex(episodeValue),
    timeMs: Number(timeValue) || 0,
    likeCount: Number(likeValue) || 0,
    content
  };
}

function getAliasedField(record: Record<string, string>, aliases: readonly string[]) {
  for (const alias of aliases) {
    if (record[alias] !== undefined) return record[alias];
  }
  return "";
}

function normalizeTimeSec(value: number, durationSec?: number) {
  if (!durationSec) return value > 1000 ? value / 1000 : value;
  return value > durationSec + 30 ? value / 1000 : value;
}

export { episodeIdFromIndex };
