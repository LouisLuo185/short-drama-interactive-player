import type { DanmakuEmotionType } from "./danmakuTypes.js";

export const DANMAKU_EMOTION_LEXICON: Record<Exclude<DanmakuEmotionType, "unknown">, string[]> = {
  comedy: ["哈哈", "笑死", "笑不活", "绷不住", "救命", "捂脸", "离谱", "太搞笑", "有病吧"],
  sweet: ["好甜", "磕", "磕到", "送心", "爱慕", "好会", "心动", "在一起", "亲了", "甜死"],
  reversal: ["反转", "出其不意", "变脸", "怎么可能", "真的假的", "不是吧", "身份", "假冒", "真相", "原来", "悬念"],
  satisfying: ["爽", "打脸", "活该", "终于", "解气", "霸气", "赢了", "反击", "舒服了"],
  anger: ["气死", "无语", "恶心", "太坏", "过分", "坏人", "反派", "烦死", "别欺负"],
  sad: ["心疼", "哭了", "破防", "难受", "刀", "虐", "别这样", "好惨", "可怜", "泪目"],
  appearance: ["好帅", "好美", "颜值", "帅", "美", "登场", "来了", "出场", "男主", "女主"],
  family: ["亲情", "妈妈", "爷爷", "奶奶", "家人", "想他", "回来了", "团圆", "暖心", "感动"]
};

export const HIGHLIGHT_KEYWORDS = [
  "笑死",
  "好甜",
  "磕",
  "反转",
  "爽",
  "打脸",
  "气死",
  "心疼",
  "捂脸",
  "来了"
];

export function detectDanmakuEmotions(text: string): DanmakuEmotionType[] {
  const matched = Object.entries(DANMAKU_EMOTION_LEXICON)
    .filter(([, words]) => words.some((word) => text.includes(word)))
    .map(([emotion]) => emotion as DanmakuEmotionType);

  return matched.length > 0 ? matched : ["unknown"];
}

export function extractDanmakuKeywords(text: string) {
  const words = new Set<string>();

  for (const word of [...HIGHLIGHT_KEYWORDS, ...Object.values(DANMAKU_EMOTION_LEXICON).flat()]) {
    if (text.includes(word)) words.add(word);
  }

  const bracketTags = text.match(/\[[^\]]{1,8}\]/g) ?? [];
  for (const tag of bracketTags) {
    words.add(tag);
  }

  return Array.from(words);
}

