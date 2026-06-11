export type TimelineEventSource = "highlight_api" | "client_system" | "future_runtime";

export type TimelineEvent = {
  id: string;
  episodeId: string;
  source: TimelineEventSource;
  type: string;
  startTimeSec: number;
  peakTimeSec?: number;
  endTimeSec: number;
  highlightType?: string;
  confidence?: number;
  title: string;
  description?: string;
  interactionType: string;
  interactionPayload?: Record<string, unknown>;
  priority: number;
  showOnce: boolean;
  actionOnce: boolean;
};

export type PlaybackAnalyticsType =
  | "enter_page"
  | "leave_page"
  | "play"
  | "pause"
  | "seek"
  | "ended";
