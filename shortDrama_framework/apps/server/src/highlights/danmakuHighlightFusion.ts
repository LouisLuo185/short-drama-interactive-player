import type {
  DanmakuEmotionType,
  DanmakuSignalsFile,
  DanmakuWindowSignal
} from "../danmaku/danmakuTypes.js";

type HighlightCandidateLike = Record<string, unknown>;

const DEFAULT_ALPHA = 0.6;
const LOW_DANMAKU_ALPHA = 0.75;
const DANMAKU_ONLY_THRESHOLD = 0.72;

const HIGHLIGHT_TO_DANMAKU_EMOTIONS: Array<{
  patterns: string[];
  emotions: DanmakuEmotionType[];
}> = [
  { patterns: ["身份反转", "反转", "悬念", "设定揭露"], emotions: ["reversal", "satisfying"] },
  { patterns: ["打脸", "爽点"], emotions: ["satisfying", "anger"] },
  { patterns: ["喜剧", "反差", "笑"], emotions: ["comedy"] },
  { patterns: ["冲突", "羞辱"], emotions: ["anger"] },
  { patterns: ["撒糖", "暧昧", "甜"], emotions: ["sweet"] },
  { patterns: ["亲情", "情绪"], emotions: ["family", "sad"] },
  { patterns: ["角色登场", "登场", "颜值"], emotions: ["appearance"] }
];

export function fuseHighlightCandidatesWithDanmaku(params: {
  candidates: HighlightCandidateLike[];
  danmakuSignals: DanmakuSignalsFile | null;
}) {
  if (!params.danmakuSignals) {
    return {
      candidates: params.candidates,
      danmakuOnlyCandidates: [],
      fusionSummary: {
        enabled: false,
        reason: "danmaku_signals_not_found"
      }
    };
  }

  const alpha = params.danmakuSignals.quality.danmaku_quality === "low" ? LOW_DANMAKU_ALPHA : DEFAULT_ALPHA;
  const enhanced = params.candidates.map((candidate) =>
    fuseHighlightWithDanmaku(candidate, params.danmakuSignals!, { alpha })
  );
  const ranked = enhanced
    .slice()
    .sort((a, b) => getFinalScore(b) - getFinalScore(a))
    .map((candidate, index) => {
      const record = candidate as Record<string, unknown>;
      record.final_rank = index + 1;
      return candidate;
    });
  const rankMap = new Map(ranked.map((candidate) => [getCandidateId(candidate), candidate]));
  const candidates = enhanced.map((candidate) => rankMap.get(getCandidateId(candidate)) ?? candidate);
  const danmakuOnlyCandidates = buildDanmakuOnlyCandidates({
    candidates,
    danmakuSignals: params.danmakuSignals
  });

  return {
    candidates,
    danmakuOnlyCandidates,
    fusionSummary: {
      enabled: true,
      alpha,
      danmaku_quality: params.danmakuSignals.quality.danmaku_quality,
      danmaku_count: params.danmakuSignals.quality.danmaku_count,
      danmaku_only_candidate_count: danmakuOnlyCandidates.length
    }
  };
}

export function buildDanmakuNearbySignalsForPrompt(params: {
  danmakuSignals: DanmakuSignalsFile | null;
  startSec: number;
  endSec: number;
  markerTime?: number;
}) {
  if (!params.danmakuSignals) return null;

  const matchStart = Number.isFinite(params.markerTime)
    ? Number(params.markerTime) - 3
    : params.startSec - 2;
  const matchEnd = Number.isFinite(params.markerTime)
    ? Number(params.markerTime) + 8
    : params.endSec + 8;
  const nearbyWindows = params.danmakuSignals.windows.filter((window) =>
    overlaps(window.startSec, window.endSec, matchStart, matchEnd)
  );
  if (nearbyWindows.length === 0) {
    return {
      match_window: `${round(matchStart)}s-${round(matchEnd)}s`,
      density_score: 0,
      like_score: 0,
      emotion_score: 0,
      topic_score: 0,
      keyword_score: 0,
      danmaku_salience_score: 0,
      top_keywords: [],
      top_comments: [],
      emotion_distribution: {}
    };
  }

  const strongest = nearbyWindows
    .slice()
    .sort((a, b) => b.danmakuSalienceScore - a.danmakuSalienceScore)[0];

  return {
    match_window: `${round(matchStart)}s-${round(matchEnd)}s`,
    density_score: strongest.densityScore,
    like_score: strongest.likeScore,
    emotion_score: strongest.emotionScore,
    topic_score: strongest.topicScore,
    keyword_score: strongest.keywordScore,
    danmaku_salience_score: strongest.danmakuSalienceScore,
    top_keywords: unique(nearbyWindows.flatMap((window) => window.topKeywords)).slice(0, 8),
    top_comments: nearbyWindows
      .flatMap((window) => window.topComments)
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, 5)
      .map((comment) => comment.content),
    emotion_distribution: mergeEmotionDistributions(nearbyWindows)
  };
}

export function fuseHighlightWithDanmaku(
  candidate: HighlightCandidateLike,
  danmakuSignals: DanmakuSignalsFile,
  options: { alpha?: number } = {}
) {
  const next = structuredClone(candidate) as HighlightCandidateLike;
  const nearbyWindows = findNearbyWindows(next, danmakuSignals.windows);
  const maxWindow = nearbyWindows
    .slice()
    .sort((a, b) => b.danmakuSalienceScore - a.danmakuSalienceScore)[0];
  const maxDss = maxWindow?.danmakuSalienceScore ?? 0;
  const typeMatchScore = calculateTypeMatchScore(next, nearbyWindows);
  const supportScore = clamp01(0.7 * maxDss + 0.3 * typeMatchScore);
  const asrScore = getCandidateScore(next);
  const alpha = options.alpha ?? DEFAULT_ALPHA;
  const finalScore = clamp01(alpha * asrScore + (1 - alpha) * supportScore);
  const support = {
    support_score: supportScore,
    max_dss: maxDss,
    type_match_score: typeMatchScore,
    matched_window_ids: nearbyWindows.map((window) => window.windowId),
    top_comments: nearbyWindows
      .flatMap((window) => window.topComments)
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, 5),
    top_keywords: unique(nearbyWindows.flatMap((window) => window.topKeywords)).slice(0, 10),
    emotion_distribution: mergeEmotionDistributions(nearbyWindows)
  };

  next.danmaku_support = support;
  next.final_score = finalScore;
  next.needs_human_review = Boolean(next.needs_human_review) || shouldReview(asrScore, supportScore);

  const review = ensureRecord(next, "review");
  review.needs_human_review = Boolean(review.needs_human_review) || shouldReview(asrScore, supportScore);
  if (shouldReview(asrScore, supportScore)) {
    const reasons = Array.isArray(review.risk_reasons) ? review.risk_reasons.map(String) : [];
    review.risk_reasons = unique([...reasons, "danmaku_high_llm_low"]);
  }

  const content = ensureRecord(next, "content");
  const existingEvidence = Array.isArray(content.danmu_evidence)
    ? content.danmu_evidence.map(String)
    : [];
  content.danmu_evidence = unique([
    ...existingEvidence,
    ...support.top_comments.slice(0, 3).map((comment) => comment.content)
  ]);

  return next;
}

function buildDanmakuOnlyCandidates(params: {
  candidates: HighlightCandidateLike[];
  danmakuSignals: DanmakuSignalsFile;
}) {
  const covered = params.candidates
    .filter((candidate) => getCandidateScore(candidate) >= 0.5)
    .map((candidate) => ({
      start: getCandidateStart(candidate) - 3,
      end: getCandidateEnd(candidate) + 8
    }));

  return params.danmakuSignals.windows
    .filter((window) => window.danmakuSalienceScore >= DANMAKU_ONLY_THRESHOLD)
    .filter((window) => !covered.some((range) => overlaps(window.startSec, window.endSec, range.start, range.end)))
    .slice()
    .sort((a, b) => b.danmakuSalienceScore - a.danmakuSalienceScore)
    .slice(0, 10)
    .map((window, index) => ({
      schema_version: "1.0",
      candidate_source: "danmaku_only",
      episode_id: params.danmakuSignals.episode_id,
      window_id: `${window.windowId}_only`,
      start: window.startSec,
      end: window.endSec,
      marker_time: window.centerSec,
      danmaku_support: {
        support_score: window.danmakuSalienceScore,
        max_dss: window.danmakuSalienceScore,
        type_match_score: 0,
        matched_window_ids: [window.windowId],
        top_comments: window.topComments,
        top_keywords: window.topKeywords,
        emotion_distribution: window.emotionDistribution
      },
      final_score: window.danmakuSalienceScore,
      final_rank: index + 1,
      needs_human_review: true,
      possible_reason: "弹幕热度高但 ASR/LLM 高光候选未覆盖，可能是画面、颜值、动作或弹幕梗高光。"
    }));
}

function findNearbyWindows(candidate: HighlightCandidateLike, windows: DanmakuWindowSignal[]) {
  const markerTime = getCandidateMarkerTime(candidate);
  const start = Number.isFinite(markerTime) ? markerTime - 3 : getCandidateStart(candidate) - 2;
  const end = Number.isFinite(markerTime) ? markerTime + 8 : getCandidateEnd(candidate) + 8;

  return windows.filter((window) => overlaps(window.startSec, window.endSec, start, end));
}

function calculateTypeMatchScore(candidate: HighlightCandidateLike, windows: DanmakuWindowSignal[]) {
  const highlightType = getCandidateType(candidate);
  const emotions = resolveExpectedEmotions(highlightType);
  if (emotions.length === 0) return 0;

  const merged = mergeEmotionDistributions(windows);
  const total = Object.entries(merged)
    .filter(([emotion]) => emotion !== "unknown")
    .reduce((sum, [, value]) => sum + value, 0);
  if (total <= 0) return 0;

  const matched = emotions.reduce((sum, emotion) => sum + (merged[emotion] ?? 0), 0);
  return clamp01(matched / total);
}

function resolveExpectedEmotions(highlightType: string) {
  const matched = HIGHLIGHT_TO_DANMAKU_EMOTIONS.find((item) =>
    item.patterns.some((pattern) => highlightType.includes(pattern))
  );
  return matched?.emotions ?? [];
}

function mergeEmotionDistributions(windows: DanmakuWindowSignal[]) {
  const merged: Record<string, number> = {};
  for (const window of windows) {
    for (const [emotion, count] of Object.entries(window.emotionDistribution)) {
      merged[emotion] = (merged[emotion] ?? 0) + count;
    }
  }
  return merged;
}

function getCandidateId(candidate: HighlightCandidateLike) {
  return String(candidate.window_id ?? "unknown_window");
}

function getCandidateScore(candidate: HighlightCandidateLike) {
  const highlight = getRecord(candidate.highlight);
  return numberValue(highlight.score, numberValue(candidate.highlight_score, 0));
}

function getFinalScore(candidate: HighlightCandidateLike) {
  return numberValue(candidate.final_score, getCandidateScore(candidate));
}

function getCandidateType(candidate: HighlightCandidateLike) {
  const highlight = getRecord(candidate.highlight);
  return String(highlight.type ?? candidate.highlight_type ?? "");
}

function getCandidateStart(candidate: HighlightCandidateLike) {
  const time = getRecord(candidate.time);
  return numberValue(time.start, numberValue(candidate.start, 0));
}

function getCandidateEnd(candidate: HighlightCandidateLike) {
  const time = getRecord(candidate.time);
  return numberValue(time.end, numberValue(candidate.end, getCandidateStart(candidate)));
}

function getCandidateMarkerTime(candidate: HighlightCandidateLike) {
  const time = getRecord(candidate.time);
  return numberValue(
    time.marker_time,
    numberValue(candidate.marker_time, numberValue(candidate.trigger_time, Number.NaN))
  );
}

function shouldReview(asrScore: number, supportScore: number) {
  return asrScore < 0.55 && supportScore >= 0.72;
}

function ensureRecord(record: HighlightCandidateLike, key: string) {
  const current = record[key];
  if (current && typeof current === "object" && !Array.isArray(current)) {
    return current as Record<string, unknown>;
  }
  const next: Record<string, unknown> = {};
  record[key] = next;
  return next;
}

function getRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function numberValue(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
