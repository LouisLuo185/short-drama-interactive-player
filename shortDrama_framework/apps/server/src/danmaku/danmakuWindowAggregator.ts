import type { DanmakuComment, DanmakuWindowSignal } from "./danmakuTypes.js";
import { average, scoreDanmakuWindow, stddev } from "./danmakuScorer.js";

export function aggregateDanmakuWindows(params: {
  episodeId: string;
  comments: DanmakuComment[];
  durationSec?: number;
  windowSizeSec?: number;
  windowStepSec?: number;
}) {
  const windowSizeSec = params.windowSizeSec ?? 5;
  const windowStepSec = params.windowStepSec ?? 2.5;
  const maxTime = Math.max(
    params.durationSec ?? 0,
    params.comments.at(-1)?.timeSec ?? 0,
    windowSizeSec
  );
  const rawWindows: Array<{
    startSec: number;
    endSec: number;
    comments: DanmakuComment[];
  }> = [];

  for (let startSec = 0; startSec <= maxTime; startSec += windowStepSec) {
    const endSec = startSec + windowSizeSec;
    const comments = params.comments.filter(
      (comment) => comment.timeSec >= startSec && comment.timeSec < endSec
    );
    rawWindows.push({ startSec, endSec, comments });
  }

  const counts = rawWindows.map((window) => window.comments.length);
  const avgCount = average(counts);
  const stdCount = stddev(counts, avgCount);
  const likeSums = rawWindows.map((window) =>
    window.comments.reduce((sum, comment) => sum + comment.likeCount, 0)
  );
  const likeMaxes = rawWindows.map((window) =>
    Math.max(0, ...window.comments.map((comment) => comment.likeCount))
  );
  const maxEpisodeLikeSum = Math.max(0, ...likeSums);
  const maxEpisodeLikeMax = Math.max(0, ...likeMaxes);

  return rawWindows.map((window, index) =>
    buildWindowSignal({
      episodeId: params.episodeId,
      index,
      window,
      avgCount,
      stdCount,
      maxEpisodeLikeSum,
      maxEpisodeLikeMax
    })
  );
}

function buildWindowSignal(params: {
  episodeId: string;
  index: number;
  window: { startSec: number; endSec: number; comments: DanmakuComment[] };
  avgCount: number;
  stdCount: number;
  maxEpisodeLikeSum: number;
  maxEpisodeLikeMax: number;
}): DanmakuWindowSignal {
  const { window } = params;
  const count = window.comments.length;
  const likeSum = window.comments.reduce((sum, comment) => sum + comment.likeCount, 0);
  const likeMax = Math.max(0, ...window.comments.map((comment) => comment.likeCount));
  const score = scoreDanmakuWindow({
    comments: window.comments,
    avgCount: params.avgCount,
    stdCount: params.stdCount,
    maxEpisodeLikeSum: params.maxEpisodeLikeSum,
    maxEpisodeLikeMax: params.maxEpisodeLikeMax
  });

  return {
    episodeId: params.episodeId,
    windowId: `${params.episodeId}_danmaku_win_${String(params.index + 1).padStart(4, "0")}`,
    startSec: round(window.startSec),
    endSec: round(window.endSec),
    centerSec: round((window.startSec + window.endSec) / 2),
    count,
    likeSum,
    likeMax,
    likeAvg: score.likeAvg,
    densityScore: score.densityScore,
    likeScore: score.likeScore,
    emotionScore: score.emotionScore,
    topicScore: score.topicScore,
    keywordScore: score.keywordScore,
    danmakuSalienceScore: score.danmakuSalienceScore,
    emotionDistribution: score.emotionDistribution,
    topKeywords: score.topKeywords,
    topComments: window.comments
      .slice()
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, 5),
    sampleComments: window.comments.slice(0, 8).map((comment) => comment.content)
  };
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
