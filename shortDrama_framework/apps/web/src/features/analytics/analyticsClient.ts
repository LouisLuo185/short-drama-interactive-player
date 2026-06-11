import { postJson } from "../../services/http";
import type { InteractionReportEvent } from "../../types/interaction";

export type PlaybackAnalyticsType =
  | "enter_page"
  | "leave_page"
  | "play"
  | "pause"
  | "seek"
  | "ended";

export type PlaybackReportEvent = {
  episodeId: string;
  eventType: PlaybackAnalyticsType;
  currentTimeSec: number;
  clientTs: number;
};

export function reportInteractionEvent(event: InteractionReportEvent) {
  return postJson<{ ok: true }>("/api/analytics/interaction", event);
}

export function reportPlaybackEvent(event: PlaybackReportEvent) {
  return postJson<{ ok: true }>("/api/analytics/playback", event);
}
