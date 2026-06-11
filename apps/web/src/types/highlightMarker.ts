export type HighlightMarker = {
  id: string;
  episodeId: string;
  timeSec: number;
  startSec: number;
  endSec: number;
  type: string;
  score: number;
  priority: number;
  confidence: number;
  label: string;
  title: string;
  text: string;
  color?: string;
  source: "llm" | "llm_danmaku" | "manual";
  debug?: {
    targetSegmentId?: string;
    triggerText?: string;
    reason?: string;
    displayScore?: number;
    mergeGroupId?: string;
    danmakuReaction?: {
      topTags: string[];
      topKeywords: string[];
      topEmotion?: string;
      confidence: number;
      sourceWindowIds?: string[];
    };
  };
};
