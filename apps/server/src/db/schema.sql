CREATE TABLE IF NOT EXISTS dramas (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  cover_url TEXT NOT NULL,
  description TEXT,
  tags_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS episodes (
  id TEXT PRIMARY KEY,
  drama_id TEXT NOT NULL,
  episode_no INTEGER NOT NULL,
  title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  cover_url TEXT,
  duration_sec REAL NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (drama_id) REFERENCES dramas(id)
);

CREATE TABLE IF NOT EXISTS highlights (
  id TEXT PRIMARY KEY,
  episode_id TEXT NOT NULL,
  type TEXT NOT NULL,
  start_time_sec REAL NOT NULL,
  peak_time_sec REAL,
  end_time_sec REAL NOT NULL,
  highlight_type TEXT,
  confidence REAL,
  title TEXT NOT NULL,
  description TEXT,
  interaction_type TEXT NOT NULL,
  interaction_payload_json TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  show_once INTEGER NOT NULL DEFAULT 1,
  action_once INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (episode_id) REFERENCES episodes(id)
);

CREATE TABLE IF NOT EXISTS playback_events (
  id TEXT PRIMARY KEY,
  episode_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  current_time_sec REAL NOT NULL,
  client_ts INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS interaction_events (
  id TEXT PRIMARY KEY,
  episode_id TEXT NOT NULL,
  highlight_id TEXT,
  timeline_event_id TEXT NOT NULL,
  interaction_type TEXT NOT NULL,
  action TEXT NOT NULL,
  payload_json TEXT,
  current_time_sec REAL NOT NULL,
  client_ts INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
