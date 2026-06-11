import { selectAudioAssetForInteraction } from "../audio/highlightAudioAdapter";
import { resolveEmojiAsset } from "../data/emojiAssetRegistry";
import type {
  AnimatedEmojiInteraction,
  InteractionHighlight
} from "../types/interactionTypes";
import type { ReactionOption, ReactionWheelConfig } from "./reactionWheelTypes";

const FALLBACK_ASSET_ORDER = [
  "laugh_cry",
  "xiaoku_happy_cry",
  "yingyuan_clapping",
  "shuang_fire",
  "naodong_explode",
  "chigua_eyes",
  "kdl_heart_eyes",
  "xinteng_pleading",
  "qisi_angry"
];

const ASSET_LABELS: Record<string, string> = {
  xiaoku_happy_cry: "笑哭",
  laugh_cry: "笑哭",
  yingyuan_clapping: "打call",
  shuang_fire: "爽",
  naodong_explode: "震惊",
  chigua_eyes: "吃瓜",
  kdl_heart_eyes: "磕到",
  xinteng_pleading: "心疼",
  qisi_angry: "生气",
  smiling_eyes: "偷笑",
  jieqi_sparkles: "高光"
};

export function adaptHighlightToReactionWheelConfig(
  highlight: InteractionHighlight | null
): ReactionWheelConfig | null {
  if (!highlight) return null;

  const primaryInteraction = getPrimaryAnimatedEmojiInteraction(highlight);
  if (!primaryInteraction) return null;

  const defaultReaction = buildReactionOption(highlight, primaryInteraction, 0);
  const wheelOptions = buildWheelOptions(highlight, primaryInteraction.asset_id).slice(0, 3);

  return {
    highlightId: highlight.highlight_id,
    defaultReaction,
    wheelOptions,
    placement: {
      anchor: "video_top_right",
      fallbackAnchors: ["video_right_middle", "video_top_left"],
      offsetX: 38,
      offsetY: 54
    },
    wheel: {
      longPressMs: 500,
      arcStartDeg: 180,
      arcEndDeg: 90,
      radiusPx: 68,
      optionSizePx: 40,
      hitTargetPx: 54,
      maxOptions: 3
    },
    feedback: {
      enabled: true,
      template: "有 {percent}% 的人也觉得「{label}」",
      durationMs: 1800
    }
  };
}

function getPrimaryAnimatedEmojiInteraction(highlight: InteractionHighlight) {
  return (
    highlight.recommended_interactions
      .filter(
        (interaction): interaction is AnimatedEmojiInteraction =>
          interaction.interaction_type === "animated_emoji"
      )
      .sort((left, right) => left.priority - right.priority)[0] ?? null
  );
}

function buildWheelOptions(highlight: InteractionHighlight, defaultAssetId: string) {
  const assetIds = getCandidateAssetIds(highlight, defaultAssetId);
  return assetIds.map((assetId, index) =>
    buildReactionOption(highlight, buildInteractionFromAsset(highlight, assetId, index + 1), index + 1)
  );
}

function getCandidateAssetIds(highlight: InteractionHighlight, defaultAssetId: string) {
  const source = normalize(
    `${highlight.highlight_type} ${highlight.audience_emotion.join(" ")} ${highlight.dramatic_mechanism.join(" ")} ${highlight.plot_summary ?? ""}`
  );
  const preferred = new Set<string>();

  addPreferred(preferred, source, ["笑", "喜剧", "吐槽", "离谱"], ["laugh_cry", "chigua_eyes"]);
  addPreferred(preferred, source, ["赞", "支持", "应援", "登场", "救场"], ["yingyuan_clapping", "shuang_fire"]);
  addPreferred(preferred, source, ["爽", "打脸", "反击", "高光"], ["shuang_fire", "yingyuan_clapping"]);
  addPreferred(preferred, source, ["反转", "震惊", "真相", "悬念"], ["naodong_explode", "chigua_eyes"]);
  addPreferred(preferred, source, ["甜", "撒糖", "心动", "cp"], ["kdl_heart_eyes", "yingyuan_clapping"]);
  addPreferred(preferred, source, ["心疼", "亲情", "虐", "哭"], ["xinteng_pleading", "yingyuan_clapping"]);
  addPreferred(preferred, source, ["气", "冲突", "反派", "羞辱"], ["qisi_angry", "shuang_fire"]);

  return Array.from(new Set([...preferred, ...FALLBACK_ASSET_ORDER])).filter(
    (assetId) => assetId !== defaultAssetId && Boolean(resolveEmojiAsset(assetId))
  );
}

function buildReactionOption(
  highlight: InteractionHighlight,
  interaction: AnimatedEmojiInteraction,
  index: number
): ReactionOption {
  const asset = resolveEmojiAsset(interaction.asset_id);
  const percent = interactionToStablePercent(highlight, interaction, index);

  return {
    id: `${highlight.highlight_id}_${interaction.asset_id}`,
    label: ASSET_LABELS[interaction.asset_id] ?? interaction.button_text ?? asset?.fallback_text ?? "表情",
    emojiAssetId: interaction.asset_id,
    emojiAssetUrl: interaction.asset_url ?? asset?.asset_url,
    staticEmoji: interaction.fallback_emoji ?? asset?.fallback_emoji,
    audioAssetId: interaction.audio_asset_id,
    audioUrl: interaction.audio_url,
    heatScore: percent / 100,
    percent,
    interaction
  };
}

function buildInteractionFromAsset(
  highlight: InteractionHighlight,
  assetId: string,
  index: number
): AnimatedEmojiInteraction {
  const asset = resolveEmojiAsset(assetId);
  const label = ASSET_LABELS[assetId] ?? asset?.fallback_text ?? "表情";
  const audioAsset = selectAudioAssetForInteraction({
    emojiAssetId: assetId,
    highlightType: highlight.highlight_type,
    audienceEmotion: highlight.audience_emotion,
    text: highlight.plot_summary
  });

  return {
    interaction_type: "animated_emoji",
    interaction_id: `${highlight.highlight_id}_${assetId}_wheel_${index}`,
    priority: index + 1,
    button_text: label,
    prompt: `发送「${label}」反应`,
    emotion: label,
    asset_id: assetId,
    asset_url: asset?.asset_url,
    static_url: asset?.static_url,
    fallback_emoji: asset?.fallback_emoji,
    fallback_text: asset?.fallback_text ?? label,
    audio_asset_id: audioAsset?.assetId,
    audio_url: audioAsset?.url,
    audio_volume: audioAsset?.volume,
    audio_duration_ms: audioAsset?.durationMs,
    play_mode: "on_click",
    duration_ms: asset?.duration_ms ?? 1200,
    asset_query_tags: [label, ...(asset?.emotion_tags ?? [])],
    visual_effect: "right_bubble_pop"
  };
}

function addPreferred(
  target: Set<string>,
  source: string,
  keywords: string[],
  assetIds: string[]
) {
  if (!keywords.some((keyword) => source.includes(normalize(keyword)))) return;
  assetIds.forEach((assetId) => target.add(assetId));
}

function interactionToStablePercent(
  highlight: InteractionHighlight,
  interaction: AnimatedEmojiInteraction,
  index: number
) {
  const base = Math.round((highlight.highlight_score ?? 0.72) * 82);
  const hash = hashString(`${highlight.highlight_id}:${interaction.asset_id}`);
  const value = base + 10 - index * 7 + (hash % 9);
  return Math.max(46, Math.min(91, value));
}

function hashString(value: string) {
  return Array.from(value).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0);
}

function normalize(value: string) {
  return value.normalize("NFKC").toLowerCase();
}
