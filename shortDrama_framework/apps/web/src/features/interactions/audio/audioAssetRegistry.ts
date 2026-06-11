export type AudioAssetConfig = {
  assetId: string;
  url: string;
  durationMs: number;
  volume: number;
  emotionTags: string[];
  sceneTags: string[];
  source: "pixabay" | "mixkit" | "zapsplat" | "freesound" | "local";
  license: string;
  commercialSafe: boolean;
};

export const audioAssetRegistry: Record<string, AudioAssetConfig> = {
  ui_pop: {
    assetId: "ui_pop",
    url: "/assets/audio/sfx/ui_pop_001.mp3",
    durationMs: 450,
    volume: 0.28,
    emotionTags: ["click", "feedback"],
    sceneTags: ["emoji_click", "ui"],
    source: "local",
    license: "pending_user_asset",
    commercialSafe: false
  },
  shock_hit: {
    assetId: "shock_hit",
    url: "/assets/audio/sfx/shock_hit_001.mp3",
    durationMs: 800,
    volume: 0.32,
    emotionTags: ["shock", "reversal"],
    sceneTags: ["身份反转", "真相揭露", "悬念"],
    source: "local",
    license: "pending_user_asset",
    commercialSafe: false
  },
  whoosh_reveal: {
    assetId: "whoosh_reveal",
    url: "/assets/audio/sfx/whoosh_reveal_001.mp3",
    durationMs: 700,
    volume: 0.3,
    emotionTags: ["reveal", "whoosh"],
    sceneTags: ["身份反转", "登场", "高光"],
    source: "local",
    license: "pending_user_asset",
    commercialSafe: false
  },
  sparkle_chime: {
    assetId: "sparkle_chime",
    url: "/assets/audio/sfx/sparkle_chime_001.mp3",
    durationMs: 900,
    volume: 0.3,
    emotionTags: ["sweet", "sparkle"],
    sceneTags: ["撒糖", "名场面", "高光"],
    source: "local",
    license: "pending_user_asset",
    commercialSafe: false
  },
  funny_pop: {
    assetId: "funny_pop",
    url: "/assets/audio/sfx/funny_pop_001.mp3",
    durationMs: 650,
    volume: 0.32,
    emotionTags: ["funny", "pop"],
    sceneTags: ["喜剧反差", "吐槽", "离谱"],
    source: "local",
    license: "pending_user_asset",
    commercialSafe: false
  },
  cartoon_boing: {
    assetId: "cartoon_boing",
    url: "/assets/audio/sfx/cartoon_boing_001.mp3",
    durationMs: 700,
    volume: 0.3,
    emotionTags: ["funny", "cartoon"],
    sceneTags: ["喜剧反差", "笑哭", "离谱"],
    source: "local",
    license: "pending_user_asset",
    commercialSafe: false
  },
  clap_short: {
    assetId: "clap_short",
    url: "/assets/audio/sfx/clap_short_001.mp3",
    durationMs: 900,
    volume: 0.28,
    emotionTags: ["support", "clap"],
    sceneTags: ["应援", "救场", "角色登场"],
    source: "local",
    license: "pending_user_asset",
    commercialSafe: false
  },
  heartbeat: {
    assetId: "heartbeat",
    url: "/assets/audio/sfx/heartbeat_001.mp3",
    durationMs: 1000,
    volume: 0.26,
    emotionTags: ["suspense", "sad"],
    sceneTags: ["悬念", "心疼", "紧张"],
    source: "local",
    license: "pending_user_asset",
    commercialSafe: false
  },
  low_riser: {
    assetId: "low_riser",
    url: "/assets/audio/sfx/low_riser_001.mp3",
    durationMs: 1000,
    volume: 0.25,
    emotionTags: ["suspense", "riser"],
    sceneTags: ["结尾钩子", "悬念", "吃瓜"],
    source: "local",
    license: "pending_user_asset",
    commercialSafe: false
  },
  anger_hit: {
    assetId: "anger_hit",
    url: "/assets/audio/sfx/anger_hit_001.mp3",
    durationMs: 700,
    volume: 0.3,
    emotionTags: ["anger", "hit"],
    sceneTags: ["冲突", "羞辱", "反派"],
    source: "local",
    license: "pending_user_asset",
    commercialSafe: false
  }
};

export function resolveAudioAsset(assetId: string) {
  return audioAssetRegistry[assetId];
}
