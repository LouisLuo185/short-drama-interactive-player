export type TimelineEventType =
  | "highlight_enter"
  | "highlight_peak"
  | "highlight_exit";

export type TimelineEventSource = "highlight_api" | "client_system" | "future_runtime";

export type HighlightType =
  | "conflict"
  | "reversal"
  | "famous_scene"
  | "sweet"
  | "sad"
  | "funny"
  | "suspense"
  | "custom";

export type InteractionType =
  | "emoji_burst"
  | "reaction_vote"
  | "comment_prompt"
  | "branch_choice"
  | "none";

export type TimelineEvent = {
  id: string;
  episodeId: string;
  source: TimelineEventSource;
  type: TimelineEventType;
  startTimeSec: number;
  peakTimeSec?: number;
  endTimeSec: number;
  highlightType?: HighlightType;
  confidence?: number;
  title: string;
  description?: string;
  interactionType: InteractionType;
  interactionPayload?: Record<string, unknown>;
  priority: number;
  showOnce: boolean;
  actionOnce: boolean;
};
