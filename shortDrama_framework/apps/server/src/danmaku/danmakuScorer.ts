import type { DanmakuComment, DanmakuEmotionType } from "./danmakuTypes.js";
import { HIGHLIGHT_KEYWORDS } from "./danmakuEmotionLexicon.js";

export type DanmakuWindowScoreInput = {
  comments: DanmakuComment[];
  avgCount: number;
  stdCount: number;
  maxEpisodeLikeSum: number;
  maxEpisodeLikeMax: number;
};

export type DanmakuWindowScore = {
  likeSum: number;
  likeMax: number;
  likeAvg: number;
  densityScore: number;
  likeScore: number;
  emotionScore: number;
  topicScore: number;
  keywordScore: number;
  danmakuSalienceScore: number;
  emotionDistribution: Record<DanmakuEmotionType, number>;
  topKeywords: string[];
};

const EMOTIONS: DanmakuEmotionType[] = [
  "comedy",
  "sweet",
  "reversal",
  "satisfying",
  "anger",
  "sad",
  "appearance",
  "family",
  "unknown"
];

export function scoreDanmakuWindow(input: DanmakuWindowScoreInput): DanmakuWindowScore {
  const count = input.comments.length;
  const likeSum = input.comments.reduce((sum, comment) => sum + comment.likeCount, 0);
  const likeMax = Math.max(0, ...input.comments.map((comment) => comment.likeCount));
  const emotionDistribution = buildEmotionDistribution(input.comments);
  const keywordCounts = countKeywords(input.comments);
  const totalKeywordHits = Array.from(keywordCounts.values()).reduce((sum, value) => sum + value, 0);
  const topKeywords = Array.from(keywordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([keyword]) => keyword);
  const emotionCommentCount = input.comments.filter((comment) =>
    comment.emotions.some((emotion) => emotion !== "unknown")
  ).length;
  const highlightKeywordHits = input.comments.reduce(
    (sum, comment) =>
      sum + comment.keywords.filter((keyword) => HIGHLIGHT_KEYWORDS.includes(keyword)).length,
    0
  );
  const densityScore =
    input.avgCount < 1
      ? clamp01(count / 5)
      : clamp01(count / (input.avgCount + 2 * input.stdCount + 1e-6));
  const likeScore = clamp01(
    0.6 * safeLogRatio(likeSum, input.maxEpisodeLikeSum) +
      0.4 * safeLogRatio(likeMax, input.maxEpisodeLikeMax)
  );
  const emotionScore = count > 0 ? clamp01(emotionCommentCount / count) : 0;
  const top5KeywordHits = Array.from(keywordCounts.values())
    .sort((a, b) => b - a)
    .slice(0, 5)
    .reduce((sum, value) => sum + value, 0);
  const topicScore = totalKeywordHits > 0 ? clamp01(top5KeywordHits / totalKeywordHits) : 0;
  const keywordScore = clamp01(highlightKeywordHits / 5);
  const danmakuSalienceScore = clamp01(
    0.3 * densityScore +
      0.25 * likeScore +
      0.25 * emotionScore +
      0.1 * topicScore +
      0.1 * keywordScore
  );

  return {
    likeSum,
    likeMax,
    likeAvg: count > 0 ? round(likeSum / count) : 0,
    densityScore,
    likeScore,
    emotionScore,
    topicScore,
    keywordScore,
    danmakuSalienceScore,
    emotionDistribution,
    topKeywords
  };
}

function buildEmotionDistribution(comments: DanmakuComment[]) {
  const distribution = Object.fromEntries(EMOTIONS.map((emotion) => [emotion, 0])) as Record<
    DanmakuEmotionType,
    number
  >;

  for (const comment of comments) {
    for (const emotion of comment.emotions) {
      distribution[emotion] += 1;
    }
  }

  return distribution;
}

function countKeywords(comments: DanmakuComment[]) {
  const counts = new Map<string, number>();
  for (const comment of comments) {
    for (const keyword of comment.keywords) {
      counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
    }
  }
  return counts;
}

function safeLogRatio(value: number, maxValue: number) {
  if (maxValue <= 0) return 0;
  return Math.log1p(value) / Math.log1p(maxValue + 1e-6);
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function stddev(values: number[], avg: number) {
  if (values.length === 0) return 0;
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

