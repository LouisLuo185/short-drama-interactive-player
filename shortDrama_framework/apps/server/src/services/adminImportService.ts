import { randomUUID } from "node:crypto";
import { getDatabase } from "../db/database.js";

export type ImportHighlightInput = {
  type?: string;
  startTimeSec: number;
  peakTimeSec?: number;
  endTimeSec: number;
  highlightType?: string;
  confidence?: number;
  title: string;
  description?: string;
  interactionType: string;
  interactionPayload?: Record<string, unknown>;
  priority?: number;
  showOnce?: boolean;
  actionOnce?: boolean;
};

export type ImportEpisodeInput = {
  episodeNo: number;
  title: string;
  videoUrl: string;
  coverUrl?: string;
  durationSec: number;
  highlights?: ImportHighlightInput[];
};

export type ImportDramaInput = {
  title: string;
  description?: string;
  tags?: string[];
  coverUrl: string;
  episodes: ImportEpisodeInput[];
};

export type ImportDramaResult = {
  dramaId: string;
  episodeIds: string[];
  highlightIds: string[];
};

export function importDrama(input: ImportDramaInput): ImportDramaResult {
  validateImportDrama(input);

  const db = getDatabase();
  const now = new Date().toISOString();
  const dramaId = createId("drama");
  const episodeIds: string[] = [];
  const highlightIds: string[] = [];

  db.exec("BEGIN");

  try {
    db.prepare(
      `INSERT INTO dramas (id, title, cover_url, description, tags_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      dramaId,
      input.title.trim(),
      input.coverUrl.trim(),
      input.description?.trim() ?? "",
      JSON.stringify(input.tags ?? []),
      now,
      now
    );

    const insertEpisode = db.prepare(
      `INSERT INTO episodes
        (id, drama_id, episode_no, title, video_url, cover_url, duration_sec, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const insertHighlight = db.prepare(
      `INSERT INTO highlights
        (id, episode_id, type, start_time_sec, peak_time_sec, end_time_sec, highlight_type, confidence,
         title, description, interaction_type, interaction_payload_json, priority, show_once, action_once,
         source, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const episode of input.episodes) {
      const episodeId = createId("ep");
      episodeIds.push(episodeId);

      insertEpisode.run(
        episodeId,
        dramaId,
        episode.episodeNo,
        episode.title.trim(),
        episode.videoUrl.trim(),
        episode.coverUrl?.trim() || null,
        episode.durationSec,
        now,
        now
      );

      for (const highlight of episode.highlights ?? []) {
        const highlightId = createId("hl");
        highlightIds.push(highlightId);

        insertHighlight.run(
          highlightId,
          episodeId,
          highlight.type ?? "highlight_peak",
          highlight.startTimeSec,
          highlight.peakTimeSec ?? null,
          highlight.endTimeSec,
          highlight.highlightType ?? "custom",
          highlight.confidence ?? null,
          highlight.title.trim(),
          highlight.description?.trim() ?? "",
          highlight.interactionType,
          highlight.interactionPayload ? JSON.stringify(highlight.interactionPayload) : null,
          highlight.priority ?? 0,
          highlight.showOnce ?? true ? 1 : 0,
          highlight.actionOnce ?? false ? 1 : 0,
          "manual",
          now,
          now
        );
      }
    }

    db.exec("COMMIT");

    return {
      dramaId,
      episodeIds,
      highlightIds
    };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function validateImportDrama(input: ImportDramaInput) {
  if (!input || typeof input !== "object") {
    throw new Error("INVALID_IMPORT_PAYLOAD");
  }

  assertNonEmpty(input.title, "title");
  assertNonEmpty(input.coverUrl, "coverUrl");

  if (!Array.isArray(input.episodes) || input.episodes.length === 0) {
    throw new Error("episodes must contain at least one episode");
  }

  for (const episode of input.episodes) {
    assertPositiveNumber(episode.episodeNo, "episodeNo");
    assertNonEmpty(episode.title, "episode.title");
    assertNonEmpty(episode.videoUrl, "episode.videoUrl");
    assertPositiveNumber(episode.durationSec, "episode.durationSec");

    for (const highlight of episode.highlights ?? []) {
      assertNonEmpty(highlight.title, "highlight.title");
      assertNonEmpty(highlight.interactionType, "highlight.interactionType");
      assertNonNegativeNumber(highlight.startTimeSec, "highlight.startTimeSec");
      assertNonNegativeNumber(highlight.endTimeSec, "highlight.endTimeSec");

      if (highlight.endTimeSec < highlight.startTimeSec) {
        throw new Error("highlight.endTimeSec must be greater than or equal to startTimeSec");
      }
    }
  }
}

function assertNonEmpty(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
}

function assertPositiveNumber(value: unknown, field: string) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be a positive number`);
  }
}

function assertNonNegativeNumber(value: unknown, field: string) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a non-negative number`);
  }
}

function createId(prefix: string) {
  return `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
}
