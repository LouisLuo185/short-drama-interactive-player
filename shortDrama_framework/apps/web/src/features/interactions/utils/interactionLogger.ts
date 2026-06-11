import type { AnimatedEmojiInteraction, InteractionHighlight } from "../types/interactionTypes";

export type InteractionLogEvent = {
  event_type:
    | "interaction_exposed"
    | "interaction_clicked"
    | "interaction_dismissed"
    | "interaction_timeout"
    | "emoji_effect_played"
    | "emoji_effect_failed"
    | "emoji_effect_fallback"
    | "audio_sfx_played"
    | "audio_sfx_failed"
    | "audio_sfx_skipped";
  highlight_id: string;
  interaction_id?: string;
  interaction_type?: string;
  asset_id?: string;
  current_time?: number;
  created_at: string;
};

export function logInteractionEvent(event: Omit<InteractionLogEvent, "created_at">) {
  const payload: InteractionLogEvent = {
    ...event,
    created_at: new Date().toISOString()
  };

  console.info("[interaction]", payload);
}

export function logHighlightExposure(highlight: InteractionHighlight, currentTime: number) {
  logInteractionEvent({
    event_type: "interaction_exposed",
    highlight_id: highlight.highlight_id,
    current_time: currentTime
  });
}

export function logEmojiClick(
  highlight: InteractionHighlight,
  interaction: AnimatedEmojiInteraction,
  currentTime: number
) {
  logInteractionEvent({
    event_type: "interaction_clicked",
    highlight_id: highlight.highlight_id,
    interaction_id: interaction.interaction_id,
    interaction_type: interaction.interaction_type,
    asset_id: interaction.asset_id,
    current_time: currentTime
  });
}
