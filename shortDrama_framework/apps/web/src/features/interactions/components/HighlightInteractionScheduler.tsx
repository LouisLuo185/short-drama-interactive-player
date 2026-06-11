import { useEffect, useRef } from "react";
import type { InteractionHighlight } from "../types/interactionTypes";
import { logHighlightExposure } from "../utils/interactionLogger";

type HighlightInteractionSchedulerProps = {
  currentTime: number;
  isPlaying: boolean;
  highlights: InteractionHighlight[];
  onActivateHighlight: (highlight: InteractionHighlight) => void;
};

const TRIGGER_WINDOW_SEC = 1.5;

export function HighlightInteractionScheduler(props: HighlightInteractionSchedulerProps) {
  const triggeredIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    triggeredIdsRef.current = new Set();
  }, [props.highlights]);

  useEffect(() => {
    if (!props.isPlaying || props.highlights.length === 0) return;

    const candidates = props.highlights
      .filter((highlight) => shouldTrigger(highlight, props.currentTime, triggeredIdsRef.current))
      .sort((left, right) => {
        const levelDelta = levelWeight(right.interaction_level) - levelWeight(left.interaction_level);
        if (levelDelta !== 0) return levelDelta;
        return (right.highlight_score ?? 0) - (left.highlight_score ?? 0);
      });
    const nextHighlight = candidates[0];
    if (!nextHighlight) return;

    triggeredIdsRef.current.add(nextHighlight.highlight_id);
    logHighlightExposure(nextHighlight, props.currentTime);
    props.onActivateHighlight(nextHighlight);
  }, [props.currentTime, props.highlights, props.isPlaying, props.onActivateHighlight]);

  return null;
}

function shouldTrigger(
  highlight: InteractionHighlight,
  currentTime: number,
  triggeredIds: Set<string>
) {
  if (triggeredIds.has(highlight.highlight_id)) return false;
  if (highlight.interaction_level === "none") return false;
  if ((highlight.interrupt_risk_score ?? 0) > 0.7) return false;
  if (!highlight.recommended_interactions.some((interaction) => interaction.interaction_type === "animated_emoji")) {
    return false;
  }

  const triggerTime = highlight.interaction_trigger_time;
  return currentTime >= triggerTime && currentTime <= triggerTime + TRIGGER_WINDOW_SEC;
}

function levelWeight(level: InteractionHighlight["interaction_level"]) {
  if (level === "strong") return 3;
  if (level === "medium") return 2;
  if (level === "weak") return 1;
  return 0;
}
