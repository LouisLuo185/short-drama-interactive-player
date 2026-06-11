import { useEffect, useMemo, useState } from "react";
import type {
  AnimatedEmojiInteraction,
  InteractionHighlight
} from "../types/interactionTypes";
import { adaptHighlightToReactionWheelConfig } from "../reactionWheel/reactionWheelAdapter";
import { ReactionWheel } from "../reactionWheel/ReactionWheel";
import type { ReactionOption } from "../reactionWheel/reactionWheelTypes";

type InteractionOverlayProps = {
  highlight: InteractionHighlight | null;
  videoElement: HTMLVideoElement | null;
  playerElement: HTMLElement | null;
  onSelectInteraction: (interaction: AnimatedEmojiInteraction) => void;
  onDismiss: (reason: "manual" | "timeout") => void;
};

const AUTO_DISMISS_MS = 5200;

export function InteractionOverlay(props: InteractionOverlayProps) {
  const [hasSelected, setHasSelected] = useState(false);
  const highlightId = props.highlight?.highlight_id;
  const config = useMemo(
    () => adaptHighlightToReactionWheelConfig(props.highlight),
    [props.highlight]
  );

  useEffect(() => {
    setHasSelected(false);
  }, [highlightId]);

  useEffect(() => {
    if (!props.highlight || !config || hasSelected) return;

    const timer = window.setTimeout(() => {
      props.onDismiss("timeout");
    }, AUTO_DISMISS_MS);

    return () => window.clearTimeout(timer);
  }, [config, hasSelected, highlightId, props.onDismiss]);

  if (!props.highlight || !config) {
    return null;
  }

  return (
    <ReactionWheel
      key={config.highlightId}
      config={config}
      videoElement={props.videoElement}
      playerElement={props.playerElement}
      onSelect={(reaction: ReactionOption) => {
        setHasSelected(true);
        props.onSelectInteraction(reaction.interaction);
      }}
      onClose={() => props.onDismiss("manual")}
    />
  );
}
