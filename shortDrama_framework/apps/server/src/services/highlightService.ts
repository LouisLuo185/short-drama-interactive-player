import { getDatabase } from "../db/database.js";
import type { TimelineEvent } from "../types/domain.js";

type HighlightRow = {
  id: string;
  episode_id: string;
  type: string;
  start_time_sec: number;
  peak_time_sec: number | null;
  end_time_sec: number;
  highlight_type: string | null;
  confidence: number | null;
  title: string;
  description: string | null;
  interaction_type: string;
  interaction_payload_json: string | null;
  priority: number;
  show_once: number;
  action_once: number;
};

export function listEpisodeHighlights(episodeId: string): TimelineEvent[] {
  const rows = getDatabase()
    .prepare(
      `SELECT
        id,
        episode_id,
        type,
        start_time_sec,
        peak_time_sec,
        end_time_sec,
        highlight_type,
        confidence,
        title,
        description,
        interaction_type,
        interaction_payload_json,
        priority,
        show_once,
        action_once
       FROM highlights
       WHERE episode_id = ?
       ORDER BY start_time_sec ASC`
    )
    .all(episodeId) as HighlightRow[];

  return rows.map((row) => ({
    id: row.id,
    episodeId: row.episode_id,
    source: "highlight_api",
    type: row.type,
    startTimeSec: row.start_time_sec,
    peakTimeSec: row.peak_time_sec ?? undefined,
    endTimeSec: row.end_time_sec,
    highlightType: row.highlight_type ?? undefined,
    confidence: row.confidence ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    interactionType: row.interaction_type,
    interactionPayload: row.interaction_payload_json
      ? (JSON.parse(row.interaction_payload_json) as Record<string, unknown>)
      : undefined,
    priority: row.priority,
    showOnce: Boolean(row.show_once),
    actionOnce: Boolean(row.action_once)
  }));
}

// Future high-light labeling module extension points:
// POST /api/highlights, PUT /api/highlights/:highlightId, DELETE /api/highlights/:highlightId.
