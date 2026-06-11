import type { HighlightCandidate, HighlightWindow } from "../types.js";

export function parseHighlightCandidate(
  window: HighlightWindow,
  rawOutput: string
): HighlightCandidate {
  const parsed = parseJsonObject(rawOutput);

  if (!parsed) {
    return fallbackCandidate(window, "模型输出无法解析为 JSON", rawOutput);
  }

  return normalizeCandidate(window, parsed, rawOutput);
}

function parseJsonObject(rawOutput: string) {
  try {
    return JSON.parse(rawOutput) as Record<string, unknown>;
  } catch {
    const match = rawOutput.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

function normalizeCandidate(
  window: HighlightWindow,
  value: Record<string, unknown>,
  rawOutput: string
): HighlightCandidate {
  const isHighlight = Boolean(value.is_highlight);
  const score = clampScore(Number(value.highlight_score ?? value.asr_score ?? 0));

  return {
    window_id: asString(value.window_id, window.window_id),
    episode_id: asString(value.episode_id, window.episode_id),
    target_segment_id: asString(value.target_segment_id, window.target_segment_id),
    start: asNumber(value.start, window.start),
    end: asNumber(value.end, window.end),
    is_highlight: isHighlight,
    highlight_type: asString(
      value.highlight_type,
      isHighlight ? "普通片段" : "普通片段"
    ),
    highlight_score: score,
    plot_summary: asString(value.plot_summary, ""),
    asr_rewrite: asString(value.asr_rewrite, window.target_text),
    trigger_text: asString(value.trigger_text, ""),
    trigger_time:
      value.trigger_time === null || value.trigger_time === undefined
        ? null
        : asNumber(value.trigger_time, window.start),
    safe_interaction_title: asString(
      value.safe_interaction_title,
      isHighlight ? "高光剧情来了" : ""
    ),
    safe_interaction_prompt: asString(
      value.safe_interaction_prompt,
      isHighlight ? "你怎么看这一段？" : ""
    ),
    emotion_tags: Array.isArray(value.emotion_tags)
      ? value.emotion_tags.map((item) => String(item)).filter(Boolean)
      : [],
    name_uncertainty: Boolean(value.name_uncertainty ?? window.name_uncertainty),
    reason: asString(value.reason, ""),
    raw_model_output: rawOutput
  };
}

function fallbackCandidate(window: HighlightWindow, reason: string, rawOutput: string) {
  return {
    window_id: window.window_id,
    episode_id: window.episode_id,
    target_segment_id: window.target_segment_id,
    start: window.start,
    end: window.end,
    is_highlight: false,
    highlight_type: "普通片段",
    highlight_score: 0,
    plot_summary: "",
    asr_rewrite: window.target_text,
    trigger_text: "",
    trigger_time: null,
    safe_interaction_title: "",
    safe_interaction_prompt: "",
    emotion_tags: [],
    name_uncertainty: window.name_uncertainty,
    reason,
    raw_model_output: rawOutput
  };
}

function asString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 1);
}
