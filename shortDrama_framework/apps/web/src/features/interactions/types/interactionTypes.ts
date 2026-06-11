export type InteractionLevel = "none" | "weak" | "medium" | "strong";

export type VisualEffect = "right_bubble_pop" | "edge_float" | "small_burst" | "none";

export type AnimatedEmojiInteraction = {
  interaction_type: "animated_emoji";
  interaction_id: string;
  priority: number;
  button_text: string;
  prompt?: string;
  emotion: string;
  asset_id: string;
  asset_url?: string;
  static_url?: string;
  fallback_emoji?: string;
  fallback_text?: string;
  audio_asset_id?: string;
  audio_url?: string;
  audio_volume?: number;
  audio_duration_ms?: number;
  play_mode: "on_click";
  duration_ms: number;
  asset_query_tags?: string[];
  visual_effect?: VisualEffect;
};

export type AudioBanterInteraction = {
  interaction_type: "audio_banter";
  interaction_id: string;
  priority: number;
  button_text: string;
  prompt?: string;
  audio_asset_id?: string;
  audio_asset_url?: string;
  volume?: number;
  fallback_text?: string;
  play_mode: "on_click";
  duration_ms?: number;
};

export type QuickVoteInteraction = {
  interaction_type: "quick_vote";
  interaction_id: string;
  priority: number;
  prompt: string;
  options: Array<{
    option_id: string;
    text: string;
    emotion?: string;
    emoji_asset_id?: string;
    fallback_emoji?: string;
  }>;
};

export type GroupFeedbackInteraction = {
  interaction_type: "group_feedback";
  interaction_id: string;
  priority: number;
  prompt: string;
};

export type HighlightInteraction =
  | AnimatedEmojiInteraction
  | AudioBanterInteraction
  | QuickVoteInteraction
  | GroupFeedbackInteraction;

export type InteractionHighlight = {
  highlight_id: string;
  source_highlight_id?: string;
  episode_id?: string;
  start_time: number;
  end_time: number;
  marker_time: number;
  highlight_type: string;
  highlight_score?: number;
  trigger_text?: string;
  trigger_time: number;
  interaction_trigger_time: number;
  trigger_timing: "at_marker" | "after_key_line" | "after_reaction" | "fallback";
  plot_summary?: string;
  audience_emotion: string[];
  dramatic_mechanism: string[];
  emotion_intensity?: number;
  interaction_level: InteractionLevel;
  interrupt_risk_score?: number;
  recommended_interactions: HighlightInteraction[];
};

export type EmojiAsset = {
  asset_id: string;
  name: string;
  emotion_tags: string[];
  scene_tags?: string[];
  asset_url?: string;
  static_url?: string;
  fallback_emoji: string;
  fallback_text: string;
  license?: string;
  source?: string;
  duration_ms: number;
};
