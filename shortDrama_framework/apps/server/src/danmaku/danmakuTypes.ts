export type DanmakuEmotionType =
  | "comedy"
  | "sweet"
  | "reversal"
  | "satisfying"
  | "anger"
  | "sad"
  | "appearance"
  | "family"
  | "unknown";

export type RawDanmakuRow = {
  dramaName: string;
  episodeIndex: number;
  timeMs: number;
  likeCount: number;
  content: string;
};

export type DanmakuComment = {
  id: string;
  dramaName: string;
  episodeIndex: number;
  episodeId: string;
  timeSec: number;
  likeCount: number;
  content: string;
  emotions: DanmakuEmotionType[];
  keywords: string[];
};

export type DanmakuWindowSignal = {
  episodeId: string;
  windowId: string;
  startSec: number;
  endSec: number;
  centerSec: number;
  count: number;
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
  topComments: DanmakuComment[];
  sampleComments: string[];
};

export type DanmakuSignalsFile = {
  schema_version: "1.0";
  drama_slug: string;
  episode_id: string;
  episode_index: number;
  source_csv: string;
  match: {
    drama_names: string[];
    normalized_keys: string[];
  };
  config: {
    window_size_sec: number;
    window_step_sec: number;
  };
  quality: {
    danmaku_count: number;
    danmaku_quality: "none" | "low" | "normal";
  };
  windows: DanmakuWindowSignal[];
  summary: DanmakuEpisodeSummary;
};

export type DanmakuEpisodeSummary = {
  episode_id: string;
  episode_index: number;
  total_comments: number;
  top_liked_comments: DanmakuComment[];
  hot_windows: Array<Pick<
    DanmakuWindowSignal,
    | "windowId"
    | "startSec"
    | "endSec"
    | "centerSec"
    | "danmakuSalienceScore"
    | "topKeywords"
    | "emotionDistribution"
    | "topComments"
  >>;
  episode_emotion_summary: {
    main_emotions: DanmakuEmotionType[];
    high_reaction_ranges: string[];
  };
};

