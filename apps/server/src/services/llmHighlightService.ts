import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  HighlightMarker,
  LlmHighlightOverride,
  LlmHighlightOverrideFile,
  LlmHighlightDebugResult,
  RawLlmHighlightCandidate
} from "../types/highlight.js";
import { getEpisodeDetail } from "./episodeService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, "../..");
const llmHighlightRoot = path.join(serverRoot, "data", "4.doubao--llm_highlights");

const MIN_HIGHLIGHT_SCORE = 0.7;
const MERGE_SAME_TYPE_WITHIN_SEC = 20;
const MIN_MARKER_GAP_SEC = 8;
const MAX_MARKERS_PER_EPISODE = 6;

const TYPE_PRIORITY: Record<string, number> = {
  身份反转: 5,
  打脸爽点: 5,
  喜剧反差: 4,
  冲突羞辱: 4,
  悬念钩子: 4,
  撒糖暧昧: 3,
  亲情情绪: 3,
  设定揭露: 2,
  角色登场: 2,
  普通片段: 0
};

const TYPE_LABEL: Record<string, string> = {
  身份反转: "反转",
  打脸爽点: "打脸",
  冲突羞辱: "冲突",
  喜剧反差: "笑点",
  亲情情绪: "亲情",
  角色登场: "登场",
  设定揭露: "设定",
  撒糖暧昧: "撒糖",
  悬念钩子: "悬念"
};

const TYPE_COLOR: Record<string, string> = {
  身份反转: "#facc15",
  打脸爽点: "#fb923c",
  冲突羞辱: "#ef4444",
  喜剧反差: "#22c55e",
  亲情情绪: "#60a5fa",
  角色登场: "#a78bfa",
  设定揭露: "#38bdf8",
  撒糖暧昧: "#f472b6",
  悬念钩子: "#c084fc"
};

type CandidateFile = {
  candidates?: RawLlmHighlightCandidate[];
  strong_highlights?: RawLlmHighlightCandidate[];
};

type HighlightLocation = {
  llmEpisodeId: string;
  filePath: string | null;
  overridePath: string | null;
};

type ScoredMarker = HighlightMarker & {
  displayScore: number;
};

export function getEpisodeLlmHighlightMarkers(episodeId: string) {
  const location = resolveLlmHighlightLocation(episodeId);
  const candidates = readEpisodeCandidates(location);
  return selectDisplayMarkers(candidates).markers.map(stripMarkerDebug);
}

export function getEpisodeLlmHighlightDebug(episodeId: string): LlmHighlightDebugResult {
  const location = resolveLlmHighlightLocation(episodeId);
  const overrides = readEpisodeOverrides(location);
  const candidates = readEpisodeCandidates(location);
  const selection = selectDisplayMarkers(candidates);

  return {
    episodeId,
    llmEpisodeId: location.llmEpisodeId,
    candidates: candidates.map((candidate) => ({
      ...candidate,
      displayScore: getCandidateIsHighlight(candidate)
        ? calculateDisplayScore(getCandidateScore(candidate), getTypePriority(getCandidateType(candidate)))
        : undefined
    })),
    selectedMarkers: selection.markers,
    filteredOut: selection.filteredOut,
    overrides
  };
}

export function getEpisodeLlmHighlightOverrides(episodeId: string) {
  const location = resolveLlmHighlightLocation(episodeId);

  return {
    episodeId,
    llmEpisodeId: location.llmEpisodeId,
    overrides: readEpisodeOverrides(location)
  };
}

export function saveEpisodeLlmHighlightOverride(
  episodeId: string,
  override: LlmHighlightOverride
) {
  const location = resolveLlmHighlightLocation(episodeId);
  if (!location.overridePath) {
    throw new Error("LLM_HIGHLIGHT_FILE_NOT_FOUND");
  }

  const overrides = readEpisodeOverrides(location);
  const nextOverride = {
    ...override,
    updatedAt: new Date().toISOString()
  };
  const nextOverrides = [
    ...overrides.filter((item) => item.candidateId !== override.candidateId),
    nextOverride
  ];
  const payload: LlmHighlightOverrideFile = {
    schema_version: "1.0",
    episode_id: location.llmEpisodeId,
    updated_at: new Date().toISOString(),
    overrides: nextOverrides
  };

  fs.writeFileSync(location.overridePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  return {
    episodeId,
    llmEpisodeId: location.llmEpisodeId,
    override: nextOverride,
    overrides: nextOverrides
  };
}

function readEpisodeCandidates(location: HighlightLocation): RawLlmHighlightCandidate[] {
  if (!location.filePath || !fs.existsSync(location.filePath)) {
    return [];
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(location.filePath, "utf8")) as CandidateFile;
    const candidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];
    return applyOverridesToCandidates(candidates, readEpisodeOverrides(location));
  } catch (error) {
    console.warn(`[WARN] Failed to read LLM highlights for ${location.llmEpisodeId}:`, error);
    return [];
  }
}

function readEpisodeOverrides(location: HighlightLocation): LlmHighlightOverride[] {
  if (!location.overridePath || !fs.existsSync(location.overridePath)) {
    return [];
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(location.overridePath, "utf8")) as LlmHighlightOverrideFile;
    return Array.isArray(parsed.overrides) ? parsed.overrides : [];
  } catch (error) {
    console.warn(`[WARN] Failed to read LLM highlight overrides for ${location.llmEpisodeId}:`, error);
    return [];
  }
}

function resolveLlmHighlightLocation(episodeId: string): HighlightLocation {
  const episode = getEpisodeDetail(episodeId);
  const dramaFolder = episode ? getDramaFolderFromVideoUrl(episode.videoUrl) : null;

  if (dramaFolder) {
    const directPath = findLlmHighlightFile(episodeId, dramaFolder);
    if (directPath) return buildLocation(episodeId, directPath);
  }

  if (!episode) {
    return { llmEpisodeId: episodeId, filePath: null, overridePath: null };
  }

  const episodeNoId = `ep_${String(episode.episodeNo).padStart(3, "0")}`;
  const episodeNoPath = findLlmHighlightFile(episodeNoId, dramaFolder);
  if (episodeNoPath) {
    return buildLocation(episodeNoId, episodeNoPath);
  }

  const videoFileMatch = episode.videoUrl.match(/\/(ep_\d+)\.[a-z0-9]+$/i);
  if (videoFileMatch) {
    const videoFilePath = findLlmHighlightFile(videoFileMatch[1], dramaFolder);
    if (videoFilePath) {
      return buildLocation(videoFileMatch[1], videoFilePath);
    }
  }

  return { llmEpisodeId: episodeId, filePath: null, overridePath: null };
}

function findLlmHighlightFile(episodeId: string, dramaFolder?: string | null) {
  if (!dramaFolder) return null;

  const filePath = path.join(llmHighlightRoot, dramaFolder, episodeId, "highlight_candidates.json");
  return fs.existsSync(filePath) ? filePath : null;
}

function getDramaFolderFromVideoUrl(videoUrl: string) {
  const match = videoUrl.match(/\/media\/videos\/([^/]+)\//i);
  return match?.[1] ?? null;
}

function buildLocation(llmEpisodeId: string, filePath: string): HighlightLocation {
  return {
    llmEpisodeId,
    filePath,
    overridePath: path.join(path.dirname(filePath), "human_overrides.json")
  };
}

function applyOverridesToCandidates(
  candidates: RawLlmHighlightCandidate[],
  overrides: LlmHighlightOverride[]
) {
  if (overrides.length === 0) return candidates;

  const overrideMap = new Map(overrides.map((override) => [override.candidateId, override]));

  return candidates.map((candidate) => {
    const override = overrideMap.get(getCandidateId(candidate));
    if (!override) return candidate;

    return applyOverrideToCandidate(candidate, override);
  });
}

function applyOverrideToCandidate(
  candidate: RawLlmHighlightCandidate,
  override: LlmHighlightOverride
) {
  const next = structuredClone(candidate) as RawLlmHighlightCandidate;
  const record = next as unknown as Record<string, unknown>;
  const highlight = ensureNested(record, "highlight");
  const time = ensureNested(record, "time");
  const ui = ensureNested(record, "ui");
  const content = ensureNested(record, "content");

  if (typeof override.enabled === "boolean") {
    highlight.is_highlight = override.enabled;
    record.is_highlight = override.enabled;
  }
  if (typeof override.timeSec === "number") {
    time.marker_time = override.timeSec;
    record.marker_time = override.timeSec;
  }
  if (typeof override.startSec === "number") {
    time.start = override.startSec;
    record.start = override.startSec;
  }
  if (typeof override.endSec === "number") {
    time.end = override.endSec;
    record.end = override.endSec;
  }
  if (typeof override.type === "string") {
    highlight.type = override.type;
    record.highlight_type = override.type;
  }
  if (typeof override.score === "number") {
    highlight.score = override.score;
    record.highlight_score = override.score;
  }
  if (typeof override.priority === "number") {
    highlight.priority = override.priority;
  }
  if (typeof override.confidence === "number") {
    highlight.confidence = override.confidence;
  }
  if (typeof override.label === "string") {
    ui.marker_label = override.label;
  }
  if (typeof override.title === "string") {
    ui.tooltip_title = override.title;
    record.safe_interaction_title = override.title;
  }
  if (typeof override.text === "string") {
    ui.tooltip_text = override.text;
    record.safe_interaction_prompt = override.text;
  }
  if (typeof override.triggerText === "string") {
    content.trigger_text = override.triggerText;
    record.trigger_text = override.triggerText;
  }
  if (typeof override.reason === "string") {
    record.reason = override.reason;
  }

  return next;
}

function ensureNested(record: Record<string, unknown>, key: string) {
  const current = record[key];
  if (current && typeof current === "object") {
    return current as Record<string, unknown>;
  }

  const next: Record<string, unknown> = {};
  record[key] = next;
  return next;
}

function selectDisplayMarkers(candidates: RawLlmHighlightCandidate[]) {
  const filteredOut: LlmHighlightDebugResult["filteredOut"] = [];
  const scoredMarkers = candidates
    .flatMap((candidate) => {
      if (!getCandidateIsHighlight(candidate)) {
        filteredOut.push({ id: getCandidateId(candidate), reason: "not_highlight" });
        return [];
      }

      if (getCandidateScore(candidate) < MIN_HIGHLIGHT_SCORE) {
        filteredOut.push({ id: getCandidateId(candidate), reason: "low_score" });
        return [];
      }

      return [toScoredMarker(candidate)];
    })
    .sort((a, b) => b.displayScore - a.displayScore);

  const selected: ScoredMarker[] = [];

  for (const marker of scoredMarkers) {
    const sameTypeNearby = selected.find(
      (selectedMarker) =>
        selectedMarker.type === marker.type &&
        Math.abs(selectedMarker.timeSec - marker.timeSec) < MERGE_SAME_TYPE_WITHIN_SEC
    );

    if (sameTypeNearby) {
      filteredOut.push({
        id: marker.id,
        reason: "merged_with_nearby_same_type",
        mergedInto: sameTypeNearby.id
      });
      continue;
    }

    const tooClose = selected.find(
      (selectedMarker) => Math.abs(selectedMarker.timeSec - marker.timeSec) < MIN_MARKER_GAP_SEC
    );

    if (tooClose) {
      filteredOut.push({
        id: marker.id,
        reason: "merged_with_nearby_marker",
        mergedInto: tooClose.id
      });
      continue;
    }

    selected.push(marker);
    if (selected.length >= MAX_MARKERS_PER_EPISODE) break;
  }

  return {
    markers: selected
      .sort((a, b) => a.timeSec - b.timeSec)
      .map(({ displayScore: _displayScore, ...marker }) => marker),
    filteredOut
  };
}

function toScoredMarker(candidate: RawLlmHighlightCandidate): ScoredMarker {
  const type = getCandidateType(candidate);
  const score = getCandidateScore(candidate);
  const priority = getTypePriority(type);
  const label = getCandidateLabel(candidate, type);
  const timeSec = Math.max(0, getCandidateMarkerTime(candidate));
  const startSec = getCandidateStart(candidate);
  const endSec = getCandidateEnd(candidate);
  const displayScore = calculateDisplayScore(score, priority);

  return {
    id: getCandidateId(candidate),
    episodeId: getCandidateEpisodeId(candidate),
    timeSec,
    startSec: Math.max(0, startSec),
    endSec: Math.max(startSec, endSec),
    type,
    score,
    priority,
    confidence: getCandidateConfidence(candidate),
    label,
    title: getCandidateTitle(candidate, label),
    text: truncateText(getCandidateText(candidate)),
    color: TYPE_COLOR[type] ?? "#facc15",
    source: hasDanmakuSupport(candidate) ? "llm_danmaku" : "llm",
    debug: {
      targetSegmentId: getCandidateTargetId(candidate),
      triggerText: getCandidateTriggerText(candidate),
      reason: getCandidateReason(candidate),
      displayScore,
      danmakuReaction: getCandidateDanmakuReaction(candidate)
    },
    displayScore
  };
}

function getNested(candidate: RawLlmHighlightCandidate, key: string) {
  const record = candidate as unknown as Record<string, unknown>;
  const value = record[key];
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function hasDanmakuSupport(candidate: RawLlmHighlightCandidate) {
  const record = candidate as unknown as Record<string, unknown>;
  return Boolean(record.danmaku_support);
}

function getCandidateDanmakuReaction(candidate: RawLlmHighlightCandidate) {
  const record = candidate as unknown as Record<string, unknown>;
  const support = record.danmaku_support;
  if (!support || typeof support !== "object") return undefined;

  const supportRecord = support as Record<string, unknown>;
  const topKeywords = stringArray(supportRecord.top_keywords).slice(0, 12);
  const sourceWindowIds = stringArray(supportRecord.matched_window_ids);
  const topComments = Array.isArray(supportRecord.top_comments)
    ? supportRecord.top_comments
    : [];
  const topTags = rankDanmakuTags([
    ...topKeywords,
    ...topComments.flatMap((comment) => {
      if (!comment || typeof comment !== "object") return [];
      const content = (comment as Record<string, unknown>).content;
      return typeof content === "string" ? extractBracketTags(content) : [];
    })
  ]).slice(0, 8);
  const emotionDistribution = supportRecord.emotion_distribution;
  const topEmotion = getTopEmotion(
    emotionDistribution && typeof emotionDistribution === "object"
      ? (emotionDistribution as Record<string, unknown>)
      : {}
  );
  const supportScore = numberValue(supportRecord.support_score, 0);
  const confidence = Math.max(
    topTags.length > 0 ? 0.72 : 0,
    topEmotion ? 0.58 : 0,
    Math.min(0.95, supportScore)
  );

  if (topTags.length === 0 && !topEmotion && topKeywords.length === 0) return undefined;

  return {
    topTags,
    topKeywords,
    topEmotion,
    confidence,
    sourceWindowIds
  };
}

function extractBracketTags(text: string) {
  return text.match(/\[[^\]]{1,10}\]/g) ?? [];
}

function rankDanmakuTags(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (!value.startsWith("[") || !value.endsWith("]")) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([tag]) => tag);
}

function getTopEmotion(distribution: Record<string, unknown>) {
  return Object.entries(distribution)
    .filter(([emotion]) => emotion !== "unknown")
    .map(([emotion, value]) => [emotion, numberValue(value, 0)] as const)
    .sort((left, right) => right[1] - left[1])
    .find(([, value]) => value > 0)?.[0];
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function getCandidateId(candidate: RawLlmHighlightCandidate) {
  return stringValue((candidate as unknown as Record<string, unknown>).window_id, "unknown_window");
}

function getCandidateEpisodeId(candidate: RawLlmHighlightCandidate) {
  return stringValue((candidate as unknown as Record<string, unknown>).episode_id, "");
}

function getCandidateTargetId(candidate: RawLlmHighlightCandidate) {
  const record = candidate as unknown as Record<string, unknown>;
  const ids = record.target_sentence_ids;
  if (Array.isArray(ids)) return ids.map(String).join(",");

  return stringValue(record.target_segment_id, undefined);
}

function getCandidateIsHighlight(candidate: RawLlmHighlightCandidate) {
  const highlight = getNested(candidate, "highlight");
  return Boolean(highlight.is_highlight ?? candidate.is_highlight);
}

function getCandidateType(candidate: RawLlmHighlightCandidate) {
  const highlight = getNested(candidate, "highlight");
  return stringValue(highlight.type, candidate.highlight_type ?? "普通片段");
}

function getCandidateScore(candidate: RawLlmHighlightCandidate) {
  const record = candidate as unknown as Record<string, unknown>;
  const finalScore = numberValue(record.final_score, Number.NaN);
  if (Number.isFinite(finalScore)) return finalScore;

  const highlight = getNested(candidate, "highlight");
  return numberValue(highlight.score, candidate.highlight_score ?? 0);
}

function getCandidateConfidence(candidate: RawLlmHighlightCandidate) {
  const highlight = getNested(candidate, "highlight");
  return numberValue(highlight.confidence, getCandidateScore(candidate));
}

function getCandidateStart(candidate: RawLlmHighlightCandidate) {
  const time = getNested(candidate, "time");
  return numberValue(time.start, candidate.start ?? 0);
}

function getCandidateEnd(candidate: RawLlmHighlightCandidate) {
  const time = getNested(candidate, "time");
  return numberValue(time.end, candidate.end ?? getCandidateStart(candidate));
}

function getCandidateMarkerTime(candidate: RawLlmHighlightCandidate) {
  const time = getNested(candidate, "time");
  return numberValue(
    time.marker_time,
    candidate.marker_time ?? candidate.trigger_time ?? getCandidateStart(candidate)
  );
}

function getCandidateLabel(candidate: RawLlmHighlightCandidate, type: string) {
  const ui = getNested(candidate, "ui");
  return stringValue(ui.marker_label, TYPE_LABEL[type] ?? type);
}

function getCandidateTitle(candidate: RawLlmHighlightCandidate, label: string) {
  const ui = getNested(candidate, "ui");
  return stringValue(ui.tooltip_title, candidate.safe_interaction_title || `${label}高光`);
}

function getCandidateText(candidate: RawLlmHighlightCandidate) {
  const ui = getNested(candidate, "ui");
  const content = getNested(candidate, "content");
  return stringValue(
    ui.tooltip_text,
    candidate.safe_interaction_prompt ||
      stringValue(content.trigger_text, candidate.trigger_text || candidate.plot_summary || "")
  );
}

function getCandidateTriggerText(candidate: RawLlmHighlightCandidate) {
  const content = getNested(candidate, "content");
  return stringValue(content.trigger_text, candidate.trigger_text);
}

function getCandidateReason(candidate: RawLlmHighlightCandidate) {
  return stringValue((candidate as unknown as Record<string, unknown>).reason, undefined);
}

function getTypePriority(type: string) {
  return TYPE_PRIORITY[type] ?? 2;
}

function calculateDisplayScore(score: number, priority: number) {
  return score * 0.7 + (priority / 5) * 0.3;
}

function truncateText(value: string) {
  const text = value.trim();
  return text.length > 30 ? `${text.slice(0, 30)}...` : text;
}

function stripMarkerDebug(marker: HighlightMarker): HighlightMarker {
  if (!marker.debug?.danmakuReaction) {
    const { debug: _debug, ...publicMarker } = marker;
    return publicMarker;
  }

  return {
    ...marker,
    debug: {
      danmakuReaction: marker.debug.danmakuReaction
    }
  };
}

function stringValue(value: unknown, fallback: string): string;
function stringValue(value: unknown, fallback?: string): string | undefined;
function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
