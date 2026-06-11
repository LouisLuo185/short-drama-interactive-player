import type { HighlightMarker } from "../../../types/highlightMarker";

export type DanmakuReactionEmojiResult = {
  assetId: string;
  emotion: string;
  reason: "tag" | "emotion" | "keyword";
};

type DanmakuReaction = NonNullable<NonNullable<HighlightMarker["debug"]>["danmakuReaction"]>;

type ReactionRule = {
  assetId: string;
  emotion: string;
  tags: string[];
  keywords: string[];
  emotions: string[];
};

const MIN_REACTION_CONFIDENCE = 0.45;

const REACTION_RULES: ReactionRule[] = [
  {
    assetId: "laugh_cry",
    emotion: "笑哭",
    tags: ["[笑哭]", "[捂脸]", "[偷笑]", "[笑]", "[大笑]", "[尬笑]"],
    keywords: ["哈哈", "笑死", "搞笑", "绷不住", "离谱", "人在囧途"],
    emotions: ["comedy"]
  },
  {
    assetId: "yingyuan_clapping",
    emotion: "认可",
    tags: ["[送花]", "[鼓掌]", "[赞]", "[顶帖]"],
    keywords: ["好看", "厉害", "演技", "不错", "点赞", "支持", "必火"],
    emotions: ["appearance", "support"]
  },
  {
    assetId: "kdl_heart_eyes",
    emotion: "心动",
    tags: ["[爱慕]", "[送心]", "[爱心]", "[飞吻]", "[害羞]", "[舔屏]"],
    keywords: ["好甜", "磕", "心动", "爱了", "般配"],
    emotions: ["sweet"]
  },
  {
    assetId: "shuang_fire",
    emotion: "爽",
    tags: ["[爽]", "[酷]"],
    keywords: ["爽", "解气", "打脸", "反击", "舒服", "燃"],
    emotions: ["satisfying"]
  },
  {
    assetId: "naodong_explode",
    emotion: "震惊",
    tags: ["[震惊]", "[惊呆]", "[石化]", "[什么]"],
    keywords: ["反转", "原来", "没想到", "真的假的", "震惊"],
    emotions: ["reversal"]
  },
  {
    assetId: "xinteng_pleading",
    emotion: "心疼",
    tags: ["[哭]", "[快哭了]", "[伤心]", "[委屈]"],
    keywords: ["心疼", "哭了", "想妈妈", "破防", "难受", "泪目"],
    emotions: ["sad", "family"]
  },
  {
    assetId: "chigua_eyes",
    emotion: "吃瓜",
    tags: ["[吃瓜]", "[探究]", "[思考]", "[没看够]", "[求爆更]"],
    keywords: ["后面", "求爆更", "没看够", "期待", "继续"],
    emotions: []
  },
  {
    assetId: "qisi_angry",
    emotion: "生气",
    tags: ["[怒]", "[抓狂]", "[吐]", "[撇嘴]", "[恐惧]"],
    keywords: ["气死", "恶心", "反派", "坏人", "过分", "无语"],
    emotions: ["anger"]
  }
];

export function selectDanmakuReactionEmoji(
  marker: HighlightMarker
): DanmakuReactionEmojiResult | null {
  const reaction = marker.debug?.danmakuReaction;
  if (!reaction || reaction.confidence < MIN_REACTION_CONFIDENCE) return null;

  const tagResult = firstMatchingRule(reaction.topTags, "tags");
  if (tagResult) return { ...tagResult, reason: "tag" };

  const emotionResult = matchByDominantEmotion(reaction);
  if (emotionResult) return { ...emotionResult, reason: "emotion" };

  const keywordResult = firstMatchingRule(reaction.topKeywords, "keywords");
  if (keywordResult) return { ...keywordResult, reason: "keyword" };

  return null;
}

function matchByDominantEmotion(reaction: DanmakuReaction) {
  const topEmotion = normalize(reaction.topEmotion ?? "");
  if (!topEmotion) return null;

  const rule = REACTION_RULES.find((item) =>
    item.emotions.some((emotion) => normalize(emotion) === topEmotion)
  );
  if (!rule) return null;

  return {
    assetId: rule.assetId,
    emotion: rule.emotion
  };
}

function firstMatchingRule(values: string[], field: "tags" | "keywords") {
  const source = values.map(normalize).filter(Boolean);
  const rule = REACTION_RULES.find((item) =>
    item[field].some((value) => source.some((sourceValue) => sourceValue.includes(normalize(value))))
  );

  if (!rule) return null;

  return {
    assetId: rule.assetId,
    emotion: rule.emotion
  };
}

function normalize(value: string) {
  return value.normalize("NFKC").toLowerCase().trim();
}
