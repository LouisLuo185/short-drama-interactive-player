import { randomUUID } from "node:crypto";
import { getDatabase } from "../db/database.js";
import type { PlaybackAnalyticsType } from "../types/domain.js";

const playbackTypes = new Set<PlaybackAnalyticsType>([
  "enter_page",
  "leave_page",
  "play",
  "pause",
  "seek",
  "ended"
]);

export function recordPlaybackEvent(input: {
  episodeId: string;
  eventType: string;
  currentTimeSec: number;
  clientTs: number;
}) {
  if (!playbackTypes.has(input.eventType as PlaybackAnalyticsType)) {
    throw new Error("INVALID_PLAYBACK_EVENT_TYPE");
  }

  getDatabase()
    .prepare(
      `INSERT INTO playback_events
        (id, episode_id, event_type, current_time_sec, client_ts, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      randomUUID(),
      input.episodeId,
      input.eventType,
      input.currentTimeSec,
      input.clientTs,
      new Date().toISOString()
    );
}

export function recordInteractionEvent(input: {
  episodeId: string;
  highlightId?: string;
  timelineEventId: string;
  interactionType: string;
  action: string;
  payload?: Record<string, unknown>;
  currentTimeSec: number;
  clientTs: number;
}) {
  getDatabase()
    .prepare(
      `INSERT INTO interaction_events
        (id, episode_id, highlight_id, timeline_event_id, interaction_type, action,
         payload_json, current_time_sec, client_ts, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      randomUUID(),
      input.episodeId,
      input.highlightId ?? null,
      input.timelineEventId,
      input.interactionType,
      input.action,
      input.payload ? JSON.stringify(input.payload) : null,
      input.currentTimeSec,
      input.clientTs,
      new Date().toISOString()
    );
}
