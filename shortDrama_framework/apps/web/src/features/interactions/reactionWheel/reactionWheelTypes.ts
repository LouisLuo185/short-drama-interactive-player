import type { AnimatedEmojiInteraction } from "../types/interactionTypes";

export type ReactionOption = {
  id: string;
  label: string;
  emojiAssetId: string;
  emojiAssetUrl?: string;
  staticEmoji?: string;
  audioAssetId?: string;
  audioUrl?: string;
  heatScore?: number;
  count?: number;
  percent?: number;
  interaction: AnimatedEmojiInteraction;
};

export type ReactionWheelConfig = {
  highlightId: string;
  defaultReaction: ReactionOption;
  wheelOptions: ReactionOption[];
  placement: {
    anchor: "video_top_right" | "video_right_middle";
    fallbackAnchors: Array<"video_right_middle" | "video_top_left">;
    offsetX: number;
    offsetY: number;
  };
  wheel: {
    longPressMs: number;
    arcStartDeg: number;
    arcEndDeg: number;
    radiusPx: number;
    optionSizePx: number;
    hitTargetPx: number;
    maxOptions: number;
  };
  feedback: {
    enabled: boolean;
    template: string;
    durationMs: number;
  };
};

export type ReactionWheelState =
  | "idle"
  | "pressing"
  | "expanded"
  | "selecting"
  | "selected"
  | "cooldown";

export type ReactionSelectPayload = {
  highlightId: string;
  reactionId: string;
  label: string;
  emojiAssetId: string;
  audioAssetId?: string;
  timestamp: number;
};
