import fs from "node:fs/promises";
import path from "node:path";
import { callDoubao } from "../llm/doubaoClient.js";
import type { RefinedSentence, RefinedSentencesFile } from "../asr/types.js";
import { computeMarkerTime } from "./highlightTimePolicy.js";
import { buildRefinedHighlightMessages } from "./refinedHighlightPrompt.js";
import { loadStoryContext } from "./storyContext.js";
import { loadDanmakuSignals } from "../danmaku/danmakuSignalService.js";
import {
  buildDanmakuNearbySignalsForPrompt,
  fuseHighlightCandidatesWithDanmaku
} from "./danmakuHighlightFusion.js";

const VALID_HIGHLIGHT_TYPES = new Set([
  "角色登场",
  "冲突羞辱",
  "身份反转",
  "打脸爽点",
  "喜剧反差",
  "亲情情绪",
  "设定揭露",
  "撒糖暧昧",
  "悬念钩子",
  "普通片段"
]);

export type RefinedHighlightCandidate = {
  schema_version: "1.0";
  episode_id: string;
  window_id: string;
  target_sentence_ids: string[];
  time: {
    start: number;
    end: number;
    trigger_sentence_id: string;
    trigger_sentence_start: number;
    trigger_sentence_end: number;
    marker_time_policy: "after_trigger_sentence_end";
    marker_time: number;
  };
  highlight: {
    is_highlight: boolean;
    type: string;
    score: number;
    priority: number;
    confidence: number;
  };
  content: {
    plot_summary: string;
    trigger_text: string;
    asr_rewrite: string;
    main_character_refs: string[];
    supporting_character_refs: string[];
    relationship_context: string;
    danmu_evidence: string[];
  };
  ui: {
    marker_label: string;
    tooltip_title: string;
    tooltip_text: string;
    interaction_prompt: string;
  };
  safety: {
    name_uncertainty: boolean;
    avoid_proper_names: boolean;
    role_uncertainty: boolean;
    context_insufficient: boolean;
  };
  review: {
    needs_human_review: boolean;
    risk_reasons: string[];
    editable_fields: string[];
  };
  reason: string;
};

export async function analyzeRefinedEpisodeHighlights(params: {
  dataRoot: string;
  dramaSlug: string;
  episodeId: string;
  limitWindows?: number;
}) {
  const refinedPath = path.join(
    params.dataRoot,
    "3.doubao--llm_preprocess",
    params.dramaSlug,
    params.episodeId,
    "refined_sentences.json"
  );
  const refined = JSON.parse(await fs.readFile(refinedPath, "utf8")) as RefinedSentencesFile;
  const storyContext = await loadStoryContext({
    dataRoot: params.dataRoot,
    dramaSlug: params.dramaSlug,
    episodeId: params.episodeId
  });
  const windows = buildHighlightWindows(refined.sentences).slice(0, params.limitWindows);
  const danmakuSignals = await loadDanmakuSignals({
    dataRoot: params.dataRoot,
    dramaSlug: params.dramaSlug,
    episodeId: params.episodeId
  });
  const candidates: RefinedHighlightCandidate[] = [];
  const rawResponses: string[] = [];

  for (const window of windows) {
    const windowId = `${params.episodeId}_refined_win_${String(window.index + 1).padStart(4, "0")}`;
    try {
      const raw = await callDoubao(
        buildRefinedHighlightMessages({
          episodeId: params.episodeId,
          windowId,
          sentences: window.sentences,
          storyContext,
          danmakuNearbySignals: buildDanmakuNearbySignalsForPrompt({
            danmakuSignals,
            startSec: window.sentences[0]?.start ?? 0,
            endSec: window.sentences.at(-1)?.end ?? 0
          })
        }),
        {
          temperature: 0.2,
          maxTokens: 1400
        }
      );
      const candidate = normalizeCandidate({
        raw,
        episodeId: params.episodeId,
        windowId,
        sentences: window.sentences
      });
      candidates.push(candidate);
      rawResponses.push(JSON.stringify({ window_id: windowId, raw_output: raw }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      candidates.push(fallbackCandidate(params.episodeId, windowId, window.sentences, message));
      rawResponses.push(JSON.stringify({ window_id: windowId, error: message }));
    }
  }

  const outDir = path.join(
    params.dataRoot,
    "4.doubao--llm_highlights",
    params.dramaSlug,
    params.episodeId
  );
  const strongHighlights = candidates.filter(
    (candidate) => candidate.highlight.is_highlight && candidate.highlight.score >= 0.78
  );
  const fusion = fuseHighlightCandidatesWithDanmaku({
    candidates: candidates as unknown as Record<string, unknown>[],
    danmakuSignals
  });
  const output = {
    episode_id: params.episodeId,
    source: {
      input: "refined_sentences.json",
      asr_engine: "whisperX",
      llm_model: process.env.ARK_MODEL ?? "doubao-seed-2-0-lite",
      story_context_files: storyContext.loaded_files,
      danmaku_signals_loaded: Boolean(danmakuSignals)
    },
    candidates: fusion.candidates,
    danmaku_fusion: fusion.fusionSummary,
    summary: {
      analyzed_windows: windows.length,
      candidate_count: candidates.length,
      strong_highlight_count: strongHighlights.length,
      danmaku_only_candidate_count: fusion.danmakuOnlyCandidates.length,
      generated_at: new Date().toISOString()
    }
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    path.join(outDir, "highlight_candidates.json"),
    `${JSON.stringify(output, null, 2)}\n`,
    "utf8"
  );
  await fs.writeFile(
    path.join(outDir, "danmaku_only_candidates.json"),
    `${JSON.stringify(
      {
        schema_version: "1.0",
        episode_id: params.episodeId,
        candidates: fusion.danmakuOnlyCandidates,
        summary: {
          candidate_count: fusion.danmakuOnlyCandidates.length,
          generated_at: new Date().toISOString()
        }
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  await fs.writeFile(path.join(outDir, "raw_responses.jsonl"), `${rawResponses.join("\n")}\n`, "utf8");
  await fs.writeFile(
    path.join(outDir, "summary.json"),
    `${JSON.stringify(output.summary, null, 2)}\n`,
    "utf8"
  );

  return output.summary;
}

function buildHighlightWindows(sentences: RefinedSentence[]) {
  const windows: Array<{ index: number; sentences: RefinedSentence[] }> = [];

  for (const [index, sentence] of sentences.entries()) {
    if (!sentence.is_potential_trigger && sentence.sentence_type === "statement") {
      continue;
    }

    const startIndex = Math.max(0, index - 2);
    const endIndex = Math.min(sentences.length, index + 3);
    const windowSentences = sentences.slice(startIndex, endIndex);
    const duration = windowSentences.at(-1)!.end - windowSentences[0].start;

    if (duration <= 25) {
      windows.push({ index, sentences: windowSentences });
    }
  }

  if (windows.length > 0) return windows;

  for (let index = 0; index < sentences.length; index += 3) {
    windows.push({ index, sentences: sentences.slice(index, index + 5) });
  }

  return windows;
}

function normalizeCandidate(params: {
  raw: string;
  episodeId: string;
  windowId: string;
  sentences: RefinedSentence[];
}): RefinedHighlightCandidate {
  const parsed = parseJsonObject(params.raw);
  if (!parsed) {
    return fallbackCandidate(params.episodeId, params.windowId, params.sentences, "模型输出无法解析为 JSON");
  }

  const time = asRecord(parsed.time);
  const highlight = asRecord(parsed.highlight);
  const content = asRecord(parsed.content);
  const ui = asRecord(parsed.ui);
  const safety = asRecord(parsed.safety);
  const review = asRecord(parsed.review);
  const triggerSentenceId = asString(time.trigger_sentence_id, params.sentences[0]?.sentence_id ?? "");
  const triggerSentence =
    params.sentences.find((sentence) => sentence.sentence_id === triggerSentenceId) ??
    params.sentences[0];
  const nextSentence = params.sentences.find((sentence) => sentence.start >= triggerSentence.end);
  const triggerEnd = asNumber(time.trigger_sentence_end, triggerSentence.end);
  const markerTime = computeMarkerTime({
    triggerSentenceEnd: triggerEnd,
    nextSentenceStart: nextSentence?.start
  });

  return {
    schema_version: "1.0",
    episode_id: params.episodeId,
    window_id: params.windowId,
    target_sentence_ids: Array.isArray(parsed.target_sentence_ids)
      ? parsed.target_sentence_ids.map(String)
      : [triggerSentence.sentence_id],
    time: {
      start: asNumber(time.start, params.sentences[0]?.start ?? 0),
      end: asNumber(time.end, params.sentences.at(-1)?.end ?? triggerSentence.end),
      trigger_sentence_id: triggerSentence.sentence_id,
      trigger_sentence_start: asNumber(time.trigger_sentence_start, triggerSentence.start),
      trigger_sentence_end: triggerEnd,
      marker_time_policy: "after_trigger_sentence_end",
      marker_time: Math.max(triggerEnd, asNumber(time.marker_time, markerTime), markerTime)
    },
    highlight: {
      is_highlight: Boolean(highlight.is_highlight),
      type: normalizeHighlightType(highlight.type),
      score: normalizeScore(highlight.score, 0),
      priority: clamp(asNumber(highlight.priority, 1), 1, 5),
      confidence: normalizeScore(highlight.confidence, normalizeScore(highlight.score, 0))
    },
    content: {
      plot_summary: asString(content.plot_summary, ""),
      trigger_text: asString(content.trigger_text, triggerSentence.text),
      asr_rewrite: asString(content.asr_rewrite, triggerSentence.text),
      main_character_refs: asStringArray(content.main_character_refs),
      supporting_character_refs: asStringArray(content.supporting_character_refs),
      relationship_context: asString(content.relationship_context, ""),
      danmu_evidence: asStringArray(content.danmu_evidence)
    },
    ui: {
      marker_label: asString(ui.marker_label, ""),
      tooltip_title: asString(ui.tooltip_title, ""),
      tooltip_text: asString(ui.tooltip_text, ""),
      interaction_prompt: asString(ui.interaction_prompt, "")
    },
    safety: {
      name_uncertainty: Boolean(safety.name_uncertainty),
      avoid_proper_names: Boolean(safety.avoid_proper_names),
      role_uncertainty: Boolean(safety.role_uncertainty),
      context_insufficient: Boolean(safety.context_insufficient)
    },
    review: {
      needs_human_review: Boolean(review.needs_human_review) || Boolean(safety.name_uncertainty) || Boolean(safety.role_uncertainty),
      risk_reasons: normalizeReviewReasons(asStringArray(review.risk_reasons), safety),
      editable_fields: asStringArray(review.editable_fields, [
        "content.plot_summary",
        "ui.tooltip_title",
        "ui.tooltip_text",
        "highlight.type",
        "time.marker_time"
      ])
    },
    reason: asString(parsed.reason, "")
  };
}

function fallbackCandidate(
  episodeId: string,
  windowId: string,
  sentences: RefinedSentence[],
  reason: string
): RefinedHighlightCandidate {
  const trigger = sentences[0];
  const markerTime = computeMarkerTime({ triggerSentenceEnd: trigger?.end ?? 0 });

  return {
    schema_version: "1.0",
    episode_id: episodeId,
    window_id: windowId,
    target_sentence_ids: trigger ? [trigger.sentence_id] : [],
    time: {
      start: trigger?.start ?? 0,
      end: sentences.at(-1)?.end ?? trigger?.end ?? 0,
      trigger_sentence_id: trigger?.sentence_id ?? "",
      trigger_sentence_start: trigger?.start ?? 0,
      trigger_sentence_end: trigger?.end ?? 0,
      marker_time_policy: "after_trigger_sentence_end",
      marker_time: markerTime
    },
    highlight: {
      is_highlight: false,
      type: "普通片段",
      score: 0,
      priority: 1,
      confidence: 0
    },
    content: {
      plot_summary: "",
      trigger_text: trigger?.text ?? "",
      asr_rewrite: trigger?.text ?? "",
      main_character_refs: [],
      supporting_character_refs: [],
      relationship_context: "",
      danmu_evidence: []
    },
    ui: {
      marker_label: "",
      tooltip_title: "",
      tooltip_text: "",
      interaction_prompt: ""
    },
    safety: {
      name_uncertainty: false,
      avoid_proper_names: false,
      role_uncertainty: false,
      context_insufficient: false
    },
    review: {
      needs_human_review: true,
      risk_reasons: ["fallback_candidate"],
      editable_fields: [
        "content.plot_summary",
        "ui.tooltip_title",
        "ui.tooltip_text",
        "highlight.type",
        "time.marker_time"
      ]
    },
    reason
  };
}

function parseJsonObject(raw: string) {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function asStringArray(value: unknown, fallback: string[] = []) {
  if (!Array.isArray(value)) return fallback;
  return value.filter((item): item is string => typeof item === "string");
}

function asNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeHighlightType(value: unknown) {
  const type = asString(value, "普通片段");
  const alias: Record<string, string> = {
    喜剧punchline: "喜剧反差",
    反差打脸: "打脸爽点",
    打脸: "打脸爽点",
    关键情感表态: "设定揭露",
    隐藏大佬身份反转: "身份反转"
  };
  const normalized = alias[type] ?? type;
  return VALID_HIGHLIGHT_TYPES.has(normalized) ? normalized : "普通片段";
}

function normalizeScore(value: unknown, fallback: number) {
  const parsed = asNumber(value, fallback);
  if (parsed > 1 && parsed <= 10) return clamp(parsed / 10, 0, 1);
  if (parsed > 10 && parsed <= 100) return clamp(parsed / 100, 0, 1);
  return clamp(parsed, 0, 1);
}

function normalizeReviewReasons(
  reasons: string[],
  safety: Record<string, unknown>
) {
  const next = new Set(reasons);
  if (Boolean(safety.name_uncertainty)) next.add("name_uncertainty");
  if (Boolean(safety.role_uncertainty)) next.add("role_uncertainty");
  if (Boolean(safety.context_insufficient)) next.add("context_insufficient");
  return Array.from(next);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
