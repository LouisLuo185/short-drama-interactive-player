import { getDatabase } from "../db/database.js";

type DramaRow = {
  id: string;
  title: string;
  cover_url: string;
  description: string | null;
  tags_json: string;
  episode_count?: number;
};

export function listDramas() {
  const rows = getDatabase()
    .prepare(
      `SELECT
        d.id,
        d.title,
        d.cover_url,
        d.description,
        d.tags_json,
        COUNT(e.id) AS episode_count
       FROM dramas d
       LEFT JOIN episodes e ON e.drama_id = d.id
       GROUP BY d.id
       ORDER BY d.created_at DESC`
    )
    .all() as DramaRow[];

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    coverUrl: row.cover_url,
    description: row.description ?? "",
    tags: JSON.parse(row.tags_json) as string[],
    episodeCount: row.episode_count ?? 0
  }));
}

export function getDramaDetail(dramaId: string) {
  const drama = getDatabase()
    .prepare("SELECT id, title, cover_url, description, tags_json FROM dramas WHERE id = ?")
    .get(dramaId) as DramaRow | undefined;

  if (!drama) {
    return null;
  }

  const episodes = getDatabase()
    .prepare(
      `SELECT id, drama_id, episode_no, title, duration_sec, cover_url
       FROM episodes
       WHERE drama_id = ?
       ORDER BY episode_no ASC`
    )
    .all(dramaId) as Array<{
    id: string;
    drama_id: string;
    episode_no: number;
    title: string;
    duration_sec: number;
    cover_url: string | null;
  }>;

  return {
    id: drama.id,
    title: drama.title,
    coverUrl: drama.cover_url,
    description: drama.description ?? "",
    tags: JSON.parse(drama.tags_json) as string[],
    episodes: episodes.map((episode) => ({
      id: episode.id,
      dramaId: episode.drama_id,
      episodeNo: episode.episode_no,
      title: episode.title,
      durationSec: episode.duration_sec,
      coverUrl: episode.cover_url ?? undefined
    }))
  };
}

export type UpdateDramaInput = {
  title?: string;
  description?: string;
  tags?: string[];
  coverUrl?: string;
};

export function updateDrama(dramaId: string, input: UpdateDramaInput) {
  const existing = getDramaRow(dramaId);

  if (!existing) {
    return null;
  }

  const updates: string[] = [];
  const values: Array<string> = [];

  if (input.title !== undefined) {
    if (typeof input.title !== "string" || input.title.trim().length === 0) {
      throw new Error("title must be a non-empty string");
    }
    updates.push("title = ?");
    values.push(input.title.trim());
  }

  if (input.description !== undefined) {
    if (typeof input.description !== "string") {
      throw new Error("description must be a string");
    }
    updates.push("description = ?");
    values.push(input.description.trim());
  }

  if (input.tags !== undefined) {
    if (!Array.isArray(input.tags) || input.tags.some((tag) => typeof tag !== "string")) {
      throw new Error("tags must be a string array");
    }
    updates.push("tags_json = ?");
    values.push(JSON.stringify(input.tags.map((tag) => tag.trim()).filter(Boolean)));
  }

  if (input.coverUrl !== undefined) {
    if (typeof input.coverUrl !== "string") {
      throw new Error("coverUrl must be a string");
    }
    updates.push("cover_url = ?");
    values.push(input.coverUrl.trim());
  }

  if (updates.length === 0) {
    throw new Error("NO_UPDATABLE_FIELDS");
  }

  updates.push("updated_at = ?");
  values.push(new Date().toISOString(), dramaId);

  getDatabase()
    .prepare(`UPDATE dramas SET ${updates.join(", ")} WHERE id = ?`)
    .run(...values);

  return getDramaCard(dramaId);
}

export function deleteDrama(dramaId: string) {
  const existing = getDramaRow(dramaId);

  if (!existing) {
    return null;
  }

  const db = getDatabase();
  const episodeRows = db
    .prepare("SELECT id FROM episodes WHERE drama_id = ?")
    .all(dramaId) as Array<{ id: string }>;

  db.exec("BEGIN");

  try {
    for (const episode of episodeRows) {
      db.prepare("DELETE FROM highlights WHERE episode_id = ?").run(episode.id);
      db.prepare("DELETE FROM playback_events WHERE episode_id = ?").run(episode.id);
      db.prepare("DELETE FROM interaction_events WHERE episode_id = ?").run(episode.id);
    }

    db.prepare("DELETE FROM episodes WHERE drama_id = ?").run(dramaId);
    db.prepare("DELETE FROM dramas WHERE id = ?").run(dramaId);
    db.exec("COMMIT");
    return { deletedDramaId: dramaId };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function getDramaRow(dramaId: string) {
  return getDatabase()
    .prepare("SELECT id, title, cover_url, description, tags_json FROM dramas WHERE id = ?")
    .get(dramaId) as DramaRow | undefined;
}

function getDramaCard(dramaId: string) {
  const row = getDatabase()
    .prepare(
      `SELECT
        d.id,
        d.title,
        d.cover_url,
        d.description,
        d.tags_json,
        COUNT(e.id) AS episode_count
       FROM dramas d
       LEFT JOIN episodes e ON e.drama_id = d.id
       WHERE d.id = ?
       GROUP BY d.id`
    )
    .get(dramaId) as DramaRow | undefined;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    coverUrl: row.cover_url,
    description: row.description ?? "",
    tags: JSON.parse(row.tags_json) as string[],
    episodeCount: row.episode_count ?? 0
  };
}
