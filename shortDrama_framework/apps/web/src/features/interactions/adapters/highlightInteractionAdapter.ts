import type { HighlightMarker } from "../../../types/highlightMarker";
import { selectAudioAssetForInteraction } from "../audio/highlightAudioAdapter";
import { resolveEmojiAsset } from "../data/emojiAssetRegistry";
import { selectDanmakuReactionEmoji } from "../danmakuReaction/danmakuReactionEmojiSelector";
import type {
  AnimatedEmojiInteraction,
  HighlightInteraction,
  InteractionHighlight,
  InteractionLevel
} from "../types/interactionTypes";

type EmojiRule = {
  assetId: string;
  emotion: string;
  buttonText: string;
  keywords: string[];
  prompt: string;
};

const EMOJI_RULES: EmojiRule[] = [
  {
    assetId: "naodong_explode",
    emotion: "震惊",
    buttonText: "没想到",
    keywords: ["身份反转", "反转", "真相", "揭露", "悬念", "没想到"],
    prompt: "这个反转你猜到了吗？"
  },
  {
    assetId: "shuang_fire",
    emotion: "爽",
    buttonText: "爽到了",
    keywords: ["打脸", "爽", "反击", "救场", "霸气", "高光"],
    prompt: "这一段是不是爽到了？"
  },
  {
    assetId: "qisi_angry",
    emotion: "生气",
    buttonText: "气死了",
    keywords: ["冲突", "羞辱", "压迫", "反派", "生气"],
    prompt: "这波是不是有点气人？"
  },
  {
    assetId: "laugh_cry",
    emotion: "笑哭",
    buttonText: "笑哭",
    keywords: ["喜剧", "反差", "搞笑", "离谱", "吐槽", "笑"],
    prompt: "这一段也太好笑了吧？"
  },
  {
    assetId: "kdl_heart_eyes",
    emotion: "甜",
    buttonText: "磕到了",
    keywords: ["撒糖", "甜", "暧昧", "心动", "CP"],
    prompt: "这一幕是不是磕到了？"
  },
  {
    assetId: "xinteng_pleading",
    emotion: "心疼",
    buttonText: "心疼TA",
    keywords: ["亲情", "虐", "心疼", "误会", "难过", "哭"],
    prompt: "这一幕是不是有点心疼？"
  },
  {
    assetId: "chigua_eyes",
    emotion: "吃瓜",
    buttonText: "吃瓜",
    keywords: ["结尾", "钩子", "悬念", "期待", "围观"],
    prompt: "后面还会怎么反转？"
  },
  {
    assetId: "yingyuan_clapping",
    emotion: "支持",
    buttonText: "打call",
    keywords: ["角色登场", "救场", "支持", "应援", "名场面", "高光"],
    prompt: "这一刻值得打call吗？"
  }
];

export function adaptHighlightMarkersToInteractionHighlights(
  markers: HighlightMarker[]
): InteractionHighlight[] {
  return markers
    .map((marker) => adaptHighlightMarkerToInteractionHighlight(marker))
    .filter((highlight): highlight is InteractionHighlight => Boolean(highlight));
}

export function adaptHighlightMarkerToInteractionHighlight(
  marker: HighlightMarker
): InteractionHighlight | null {
  const markerTime = firstFiniteNumber(marker.timeSec, marker.startSec);
  if (!Number.isFinite(markerTime)) return null;

  const highlightScore = clamp(marker.score, 0, 1);
  const interactionLevel = inferInteractionLevel(highlightScore);
  if (interactionLevel === "none") return null;

  const rule = selectEmojiRule(marker);
  const recommendedInteractions = buildEmojiInteraction(marker, rule);

  return {
    highlight_id: `interaction_${marker.id}`,
    source_highlight_id: marker.id,
    episode_id: marker.episodeId,
    start_time: marker.startSec,
    end_time: marker.endSec,
    marker_time: markerTime,
    highlight_type: marker.type,
    highlight_score: highlightScore,
    trigger_text: marker.debug?.triggerText ?? marker.text,
    trigger_time: marker.startSec,
    interaction_trigger_time: markerTime,
    trigger_timing: "at_marker",
    plot_summary: marker.text || marker.title,
    audience_emotion: [rule.emotion],
    dramatic_mechanism: inferDramaticMechanism(marker),
    emotion_intensity: highlightScore,
    interaction_level: interactionLevel,
    interrupt_risk_score: inferInterruptRisk(marker),
    recommended_interactions: recommendedInteractions
  };
}

function buildEmojiInteraction(marker: HighlightMarker, rule: EmojiRule): HighlightInteraction[] {
  const asset = resolveEmojiAsset(rule.assetId);
  const audioAsset = selectAudioAssetForInteraction({
    emojiAssetId: rule.assetId,
    highlightType: marker.type,
    audienceEmotion: [rule.emotion],
    text: `${marker.title} ${marker.text}`
  });
  const interaction: AnimatedEmojiInteraction = {
    interaction_type: "animated_emoji",
    interaction_id: `${marker.id}_${rule.assetId}`,
    priority: 1,
    button_text: rule.buttonText,
    prompt: rule.prompt,
    emotion: rule.emotion,
    asset_id: rule.assetId,
    asset_url: asset?.asset_url,
    static_url: asset?.static_url,
    fallback_emoji: asset?.fallback_emoji,
    fallback_text: asset?.fallback_text ?? rule.buttonText,
    audio_asset_id: audioAsset?.assetId,
    audio_url: audioAsset?.url,
    audio_volume: audioAsset?.volume,
    audio_duration_ms: audioAsset?.durationMs,
    play_mode: "on_click",
    duration_ms: asset?.duration_ms ?? 1200,
    asset_query_tags: rule.keywords,
    visual_effect: "right_bubble_pop"
  };

  return [interaction];
}

function selectEmojiRule(marker: HighlightMarker) {
  const danmakuResult = selectDanmakuReactionEmoji(marker);
  const danmakuRule = danmakuResult ? getEmojiRuleByAssetId(danmakuResult.assetId) : null;
  if (danmakuRule) {
    return {
      ...danmakuRule,
      emotion: danmakuResult?.emotion ?? danmakuRule.emotion
    };
  }

  const source = normalize(`${marker.type} ${marker.title} ${marker.text} ${marker.label}`);
  return (
    EMOJI_RULES.find((rule) => rule.keywords.some((keyword) => source.includes(normalize(keyword)))) ??
    (marker.score >= 0.82 ? getEmojiRuleByAssetId("shuang_fire") : getEmojiRuleByAssetId("chigua_eyes")) ??
    EMOJI_RULES[0]
  );
}

function getEmojiRuleByAssetId(assetId: string) {
  return EMOJI_RULES.find((rule) => rule.assetId === assetId) ?? null;
}

function inferDramaticMechanism(marker: HighlightMarker) {
  const source = normalize(`${marker.type} ${marker.title} ${marker.text}`);
  const mechanisms: string[] = [];

  addIf(source, mechanisms, "身份揭露", ["身份", "反转", "揭露"]);
  addIf(source, mechanisms, "打脸爽点", ["打脸", "爽", "反击"]);
  addIf(source, mechanisms, "喜剧反差", ["喜剧", "反差", "笑"]);
  addIf(source, mechanisms, "撒糖心动", ["撒糖", "甜", "暧昧", "CP"]);
  addIf(source, mechanisms, "冲突压迫", ["冲突", "羞辱", "反派"]);
  addIf(source, mechanisms, "亲情情绪", ["亲情", "心疼", "虐"]);
  addIf(source, mechanisms, "结尾悬念", ["悬念", "钩子", "结尾"]);

  return unique(mechanisms).slice(0, 3);
}

function inferInteractionLevel(score: number): InteractionLevel {
  if (score >= 0.85) return "strong";
  if (score >= 0.7) return "medium";
  if (score >= 0.55) return "weak";
  return "none";
}

function inferInterruptRisk(marker: HighlightMarker) {
  const source = normalize(`${marker.type} ${marker.title} ${marker.text}`);
  if (source.includes("字幕密集") || source.includes("哭") || source.includes("虐")) return 0.62;
  if (marker.score >= 0.85) return 0.22;
  if (marker.score >= 0.7) return 0.36;
  return 0.5;
}

function addIf(source: string, target: string[], value: string, keywords: string[]) {
  if (keywords.some((keyword) => source.includes(normalize(keyword)))) {
    target.push(value);
  }
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function normalize(value: string) {
  return value.normalize("NFKC").toLowerCase();
}

function firstFiniteNumber(...values: number[]) {
  return values.find((value) => Number.isFinite(value)) ?? Number.NaN;
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
