export type RawLlmHighlightCandidate = {
  window_id: string;
  episode_id: string;
  target_segment_id?: string;
  start: number;
  end: number;
  marker_time?: number;
  is_highlight: boolean;
  highlight_type: string;
  highlight_score: number;
  plot_summary?: string;
  asr_rewrite?: string;
  trigger_text?: string;
  trigger_time?: number;
  safe_interaction_title?: string;
  safe_interaction_prompt?: string;
  emotion_tags?: string[];
  name_uncertainty?: boolean;
  reason?: string;
  raw_model_output?: string;
};

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

export type LlmHighlightOverride = {
  candidateId: string;
  enabled?: boolean;
  timeSec?: number;
  startSec?: number;
  endSec?: number;
  type?: string;
  score?: number;
  priority?: number;
  confidence?: number;
  label?: string;
  title?: string;
  text?: string;
  triggerText?: string;
  reason?: string;
  updatedAt?: string;
};

export type LlmHighlightOverrideFile = {
  schema_version: "1.0";
  episode_id: string;
  updated_at: string;
  overrides: LlmHighlightOverride[];
};

export type LlmHighlightDebugResult = {
  episodeId: string;
  llmEpisodeId?: string;
  candidates: Array<RawLlmHighlightCandidate & { displayScore?: number }>;
  selectedMarkers: HighlightMarker[];
  filteredOut: Array<{
    id: string;
    reason: string;
    mergedInto?: string;
  }>;
  overrides?: LlmHighlightOverride[];
};
