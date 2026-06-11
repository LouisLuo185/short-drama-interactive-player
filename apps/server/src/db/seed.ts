import type { DatabaseSync } from "node:sqlite";

type HighlightSeed = {
  id: string;
  episodeId: string;
  type: string;
  startTimeSec: number;
  peakTimeSec?: number;
  endTimeSec: number;
  highlightType: string;
  confidence: number;
  title: string;
  description: string;
  interactionType: string;
  interactionPayload: Record<string, unknown>;
  priority: number;
  showOnce: boolean;
  actionOnce: boolean;
};

const now = "2026-05-26T00:00:00.000Z";

const episodes = [
  {
    id: "ep_001",
    dramaId: "drama_001",
    episodeNo: 1,
    title: "第1集 重逢",
    videoUrl: "/media/videos/ep_1.mp4",
    coverUrl: "/media/covers/ep_001.jpg",
    durationSec: 92
  },
  {
    id: "ep_002",
    dramaId: "drama_001",
    episodeNo: 2,
    title: "第2集 误会",
    videoUrl: "/media/videos/ep_2.mp4",
    coverUrl: "/media/covers/ep_002.jpg",
    durationSec: 88
  },
  {
    id: "ep_003",
    dramaId: "drama_001",
    episodeNo: 3,
    title: "第3集 反转",
    videoUrl: "/media/videos/ep_3.mp4",
    coverUrl: "/media/covers/ep_003.jpg",
    durationSec: 96
  }
];

const highlights: HighlightSeed[] = [
  {
    id: "hl_001",
    episodeId: "ep_001",
    type: "highlight_peak",
    startTimeSec: 12,
    peakTimeSec: 15,
    endTimeSec: 20,
    highlightType: "sweet",
    confidence: 0.82,
    title: "雨夜重逢",
    description: "女主在雨夜认出旧爱，情绪开始升温。",
    interactionType: "emoji_burst",
    interactionPayload: { emojis: ["😭", "🔥", "心动"], text: "这一眼太有故事了！" },
    priority: 10,
    showOnce: true,
    actionOnce: false
  },
  {
    id: "hl_002",
    episodeId: "ep_001",
    type: "highlight_peak",
    startTimeSec: 35,
    peakTimeSec: 39.2,
    endTimeSec: 45,
    highlightType: "reversal",
    confidence: 0.86,
    title: "身份反转",
    description: "男主发现女主真实身份。",
    interactionType: "reaction_vote",
    interactionPayload: { question: "你站谁？", options: ["女主", "男主", "先别急"] },
    priority: 20,
    showOnce: true,
    actionOnce: true
  },
  {
    id: "hl_003",
    episodeId: "ep_002",
    type: "highlight_peak",
    startTimeSec: 18,
    peakTimeSec: 21,
    endTimeSec: 27,
    highlightType: "conflict",
    confidence: 0.8,
    title: "当众对峙",
    description: "误会升级，两人在众人面前爆发冲突。",
    interactionType: "emoji_burst",
    interactionPayload: { emojis: ["震惊", "🔥", "别吵了"], text: "这段火药味拉满。" },
    priority: 10,
    showOnce: true,
    actionOnce: false
  },
  {
    id: "hl_004",
    episodeId: "ep_002",
    type: "highlight_peak",
    startTimeSec: 50,
    peakTimeSec: 54,
    endTimeSec: 60,
    highlightType: "sad",
    confidence: 0.78,
    title: "错过解释",
    description: "女主准备解释时，男主转身离开。",
    interactionType: "reaction_vote",
    interactionPayload: { question: "此刻该追上去吗？", options: ["必须追", "让他冷静", "换我上"] },
    priority: 15,
    showOnce: true,
    actionOnce: true
  },
  {
    id: "hl_005",
    episodeId: "ep_003",
    type: "highlight_peak",
    startTimeSec: 20,
    peakTimeSec: 24,
    endTimeSec: 30,
    highlightType: "suspense",
    confidence: 0.84,
    title: "神秘录音",
    description: "关键录音揭开幕后操纵者的线索。",
    interactionType: "emoji_burst",
    interactionPayload: { emojis: ["细思极恐", "😱", "继续"], text: "线索终于来了。" },
    priority: 12,
    showOnce: true,
    actionOnce: false
  },
  {
    id: "hl_006",
    episodeId: "ep_003",
    type: "highlight_peak",
    startTimeSec: 62,
    peakTimeSec: 66,
    endTimeSec: 72,
    highlightType: "reversal",
    confidence: 0.91,
    title: "真正反派现身",
    description: "看似帮忙的人才是真正反派。",
    interactionType: "reaction_vote",
    interactionPayload: { question: "这个反转你猜到了吗？", options: ["早猜到", "完全没想到", "再看一遍"] },
    priority: 25,
    showOnce: true,
    actionOnce: true
  }
];

export function seedDatabase(db: DatabaseSync) {
  const dramaCount = db.prepare("SELECT COUNT(*) AS count FROM dramas").get() as { count: number };

  if (dramaCount.count > 0) {
    return;
  }

  db.prepare(
    `INSERT INTO dramas (id, title, cover_url, description, tags_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    "drama_001",
    "错位心动",
    "/media/covers/drama_001.jpg",
    "女主意外重逢旧爱，引发身份反转。",
    JSON.stringify(["都市", "反转", "甜虐"]),
    now,
    now
  );

  const insertEpisode = db.prepare(
    `INSERT INTO episodes
      (id, drama_id, episode_no, title, video_url, cover_url, duration_sec, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const episode of episodes) {
    insertEpisode.run(
      episode.id,
      episode.dramaId,
      episode.episodeNo,
      episode.title,
      episode.videoUrl,
      episode.coverUrl,
      episode.durationSec,
      now,
      now
    );
  }

  const insertHighlight = db.prepare(
    `INSERT INTO highlights
      (id, episode_id, type, start_time_sec, peak_time_sec, end_time_sec, highlight_type, confidence,
       title, description, interaction_type, interaction_payload_json, priority, show_once, action_once,
       source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const highlight of highlights) {
    insertHighlight.run(
      highlight.id,
      highlight.episodeId,
      highlight.type,
      highlight.startTimeSec,
      highlight.peakTimeSec ?? null,
      highlight.endTimeSec,
      highlight.highlightType,
      highlight.confidence,
      highlight.title,
      highlight.description,
      highlight.interactionType,
      JSON.stringify(highlight.interactionPayload),
      highlight.priority,
      highlight.showOnce ? 1 : 0,
      highlight.actionOnce ? 1 : 0,
      "manual",
      now,
      now
    );
  }
}
