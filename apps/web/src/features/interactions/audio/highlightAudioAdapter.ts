import { resolveAudioAsset, type AudioAssetConfig } from "./audioAssetRegistry";

const EMOJI_TO_AUDIO: Record<string, string> = {
  naodong_explode: "shock_hit",
  shuang_fire: "anger_hit",
  laugh_cry: "cartoon_boing",
  kdl_heart_eyes: "sparkle_chime",
  smiling_eyes: "funny_pop",
  xiaoku_happy_cry: "cartoon_boing",
  qisi_angry: "anger_hit",
  xinteng_pleading: "heartbeat",
  chigua_eyes: "low_riser",
  jieqi_sparkles: "sparkle_chime",
  yingyuan_clapping: "clap_short"
};

const HIGHLIGHT_TO_AUDIO: Array<{ keywords: string[]; audioAssetId: string }> = [
  { keywords: ["身份反转", "反转", "真相", "悬念"], audioAssetId: "shock_hit" },
  { keywords: ["登场", "揭露", "高光"], audioAssetId: "whoosh_reveal" },
  { keywords: ["打脸", "爽", "反击"], audioAssetId: "anger_hit" },
  { keywords: ["喜剧", "反差", "搞笑", "吐槽"], audioAssetId: "funny_pop" },
  { keywords: ["撒糖", "甜", "暧昧", "心动"], audioAssetId: "sparkle_chime" },
  { keywords: ["亲情", "心疼", "虐"], audioAssetId: "heartbeat" },
  { keywords: ["结尾", "钩子", "期待"], audioAssetId: "low_riser" },
  { keywords: ["应援", "支持", "打call"], audioAssetId: "clap_short" }
];

export function selectAudioAssetForInteraction(input: {
  emojiAssetId: string;
  highlightType: string;
  audienceEmotion: string[];
  text?: string;
}): AudioAssetConfig | null {
  const directAssetId = EMOJI_TO_AUDIO[input.emojiAssetId];
  if (directAssetId) {
    return resolveAudioAsset(directAssetId) ?? null;
  }

  const source = normalize(`${input.highlightType} ${input.audienceEmotion.join(" ")} ${input.text ?? ""}`);
  const matched = HIGHLIGHT_TO_AUDIO.find((rule) =>
    rule.keywords.some((keyword) => source.includes(normalize(keyword)))
  );

  return matched ? resolveAudioAsset(matched.audioAssetId) ?? null : resolveAudioAsset("ui_pop") ?? null;
}

function normalize(value: string) {
  return value.normalize("NFKC").toLowerCase();
}
