import type { HighlightWindow, NormalizedAsrSegment } from "../types.js";
import { average } from "./asrNormalizer.js";
import { buildInteractionSafetyNote, hasNameUncertainty } from "./textPreprocessor.js";

export function buildHighlightWindows(segments: NormalizedAsrSegment[]): HighlightWindow[] {
  return segments.map((segment, index) => buildWindow(segments, segment, index));
}

function buildWindow(
  segments: NormalizedAsrSegment[],
  current: NormalizedAsrSegment,
  index: number
): HighlightWindow {
  const previous = segments[index - 1] ?? null;
  const next = segments[index + 1] ?? null;
  const contextSegments = [previous, current, next].filter(
    (segment): segment is NormalizedAsrSegment => Boolean(segment)
  );
  const contextText = contextSegments
    .map(
      (segment) =>
        `[${segment.start.toFixed(3)}-${segment.end.toFixed(3)}] ${segment.clean_text}`
    )
    .join("\n");
  const nameUncertainty = contextSegments.some((segment) =>
    hasNameUncertainty(segment.clean_text)
  );

  return {
    window_id: `${current.episode_id}_win_${String(index + 1).padStart(3, "0")}`,
    episode_id: current.episode_id,
    target_segment_id: current.segment_id,
    start: current.start,
    end: current.end,
    context_start: contextSegments[0].start,
    context_end: contextSegments[contextSegments.length - 1].end,
    previous_text: previous?.clean_text ?? "",
    target_text: current.clean_text,
    next_text: next?.clean_text ?? "",
    context_text: `${contextText}\n\n互动安全提示：${buildInteractionSafetyNote(nameUncertainty)}`,
    asr_confidence: average(contextSegments.map((segment) => segment.asr_confidence)),
    name_uncertainty: nameUncertainty,
    recommended_task: "highlight_scoring",
    source: "whisperx_context_window"
  };
}
