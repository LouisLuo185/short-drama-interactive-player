import type { HighlightMarker } from "../../types/highlightMarker";

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

export type HighlightCandidateDebug = {
  window_id?: string;
  episode_id?: string;
  displayScore?: number;
  time?: {
    start?: number;
    end?: number;
    marker_time?: number;
  };
  highlight?: {
    is_highlight?: boolean;
    type?: string;
    score?: number;
    priority?: number;
    confidence?: number;
  };
  content?: {
    plot_summary?: string;
    trigger_text?: string;
    asr_rewrite?: string;
  };
  ui?: {
    marker_label?: string;
    tooltip_title?: string;
    tooltip_text?: string;
    interaction_prompt?: string;
  };
  review?: {
    needs_human_review?: boolean;
    risk_reasons?: string[];
    editable_fields?: string[];
  };
  safety?: {
    name_uncertainty?: boolean;
    role_uncertainty?: boolean;
    context_insufficient?: boolean;
  };
  reason?: string;
};

export type HighlightCandidateDebugResponse = {
  episodeId: string;
  llmEpisodeId?: string;
  candidates: HighlightCandidateDebug[];
  selectedMarkers?: HighlightMarker[];
  overrides?: LlmHighlightOverride[];
};
