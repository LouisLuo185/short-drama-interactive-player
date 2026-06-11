import type { EmojiAsset } from "../types/interactionTypes";

export const emojiAssetRegistry: Record<string, EmojiAsset> = {
  shuang_fire: {
    asset_id: "shuang_fire",
    name: "爽到飞起",
    emotion_tags: ["爽", "打脸", "燃"],
    scene_tags: ["身份反转", "打脸爽点", "救场", "反击"],
    asset_url: "/assets/emoji/shuang_fire.json",
    fallback_emoji: "🔥",
    fallback_text: "爽到飞起",
    license: "local_project_asset",
    source: "local_lottie_unicode_fallback",
    duration_ms: 1200
  },
  naodong_explode: {
    asset_id: "naodong_explode",
    name: "没想到",
    emotion_tags: ["震惊", "反转"],
    scene_tags: ["身份反转", "真相揭露", "脑洞"],
    asset_url: "/assets/emoji/naodong_explode.json",
    fallback_emoji: "🤯",
    fallback_text: "没想到",
    license: "local_project_asset",
    source: "local_lottie_unicode_fallback",
    duration_ms: 1200
  },
  xiaoku_happy_cry: {
    asset_id: "xiaoku_happy_cry",
    name: "笑哭了",
    emotion_tags: ["好笑", "苦笑", "心酸"],
    scene_tags: ["喜剧反差", "离谱", "反转"],
    asset_url: "/assets/emoji/xiaoku_happy_cry.json",
    fallback_emoji: "😂",
    fallback_text: "笑哭了",
    license: "local_project_asset",
    source: "local_lottie_unicode_fallback",
    duration_ms: 1200
  },
  laugh_cry: {
    asset_id: "laugh_cry",
    name: "笑哭",
    emotion_tags: ["好笑", "笑哭", "捂脸", "偷笑"],
    scene_tags: ["喜剧反差", "吐槽", "离谱", "弹幕热梗"],
    asset_url: "/assets/emoji/laugh_cry.json",
    fallback_emoji: "😂",
    fallback_text: "笑哭",
    license: "local_project_asset",
    source: "local_lottie_unicode_fallback",
    duration_ms: 1200
  },
  kdl_heart_eyes: {
    asset_id: "kdl_heart_eyes",
    name: "磕到了",
    emotion_tags: ["甜", "心动"],
    scene_tags: ["撒糖", "暧昧", "CP"],
    asset_url: "/assets/emoji/kdl_heart_eyes.json",
    fallback_emoji: "😍",
    fallback_text: "磕到了",
    license: "local_project_asset",
    source: "local_lottie_unicode_fallback",
    duration_ms: 1200
  },
  xinteng_pleading: {
    asset_id: "xinteng_pleading",
    name: "心疼TA",
    emotion_tags: ["心疼", "难过"],
    scene_tags: ["虐心", "亲情", "误会"],
    asset_url: "/assets/emoji/xinteng_pleading.json",
    fallback_emoji: "🥺",
    fallback_text: "心疼TA",
    license: "local_project_asset",
    source: "local_lottie_unicode_fallback",
    duration_ms: 1200
  },
  qisi_angry: {
    asset_id: "qisi_angry",
    name: "气死了",
    emotion_tags: ["生气", "愤怒"],
    scene_tags: ["冲突", "羞辱", "压迫"],
    asset_url: "/assets/emoji/qisi_angry.json",
    fallback_emoji: "😡",
    fallback_text: "气死了",
    license: "local_project_asset",
    source: "local_lottie_unicode_fallback",
    duration_ms: 1200
  },
  chigua_eyes: {
    asset_id: "chigua_eyes",
    name: "吃瓜",
    emotion_tags: ["吃瓜", "期待", "好奇"],
    scene_tags: ["悬念", "围观", "结尾钩子"],
    asset_url: "/assets/emoji/chigua_eyes.json",
    fallback_emoji: "👀",
    fallback_text: "吃瓜",
    license: "local_project_asset",
    source: "local_lottie_unicode_fallback",
    duration_ms: 1200
  },
  jieqi_sparkles: {
    asset_id: "jieqi_sparkles",
    name: "名场面",
    emotion_tags: ["高光", "惊喜", "期待"],
    scene_tags: ["结尾钩子", "名场面", "反转"],
    asset_url: "/assets/emoji/jieqi_sparkles.json",
    fallback_emoji: "✨",
    fallback_text: "名场面",
    license: "local_project_asset",
    source: "local_lottie_unicode_fallback",
    duration_ms: 1200
  },
  yingyuan_clapping: {
    asset_id: "yingyuan_clapping",
    name: "为TA打call",
    emotion_tags: ["支持", "应援", "赞"],
    scene_tags: ["角色登场", "救场", "反击"],
    asset_url: "/assets/emoji/yingyuan_clapping.json",
    fallback_emoji: "👏",
    fallback_text: "为TA打call",
    license: "local_project_asset",
    source: "local_lottie_unicode_fallback",
    duration_ms: 1200
  },
  smiling_eyes: {
    asset_id: "smiling_eyes",
    name: "绷不住了",
    emotion_tags: ["好笑", "偷笑"],
    scene_tags: ["喜剧反差", "尴尬", "吐槽"],
    asset_url: "/assets/emoji/smiling_eyes.json",
    fallback_emoji: "🤣",
    fallback_text: "绷不住了",
    license: "local_project_asset",
    source: "local_lottie_unicode_fallback",
    duration_ms: 1200
  }
};

export function resolveEmojiAsset(assetId: string) {
  return emojiAssetRegistry[assetId];
}
