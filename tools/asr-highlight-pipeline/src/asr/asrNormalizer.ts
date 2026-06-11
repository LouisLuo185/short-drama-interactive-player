import type { NormalizedAsrSegment, WhisperXSegment } from "../types.js";
import { cleanAsrText } from "./textPreprocessor.js";

export function normalizeWhisperXSegments(
  episodeId: string,
  rawSegments: WhisperXSegment[]
): NormalizedAsrSegment[] {
  return rawSegments.map((segment, index) => {
    const rawText = String(segment.text ?? "").trim();
    const cleanText = cleanAsrText(rawText);
    const wordScores = Array.isArray(segment.words)
      ? segment.words.map((word) => Number(word.score)).filter(Number.isFinite)
      : [];

    return {
      segment_id: `${episodeId}_seg_${String(index + 1).padStart(3, "0")}`,
      episode_id: episodeId,
      start: round(segment.start),
      end: round(segment.end),
      duration_sec: round(Number(segment.end) - Number(segment.start)),
      raw_text: rawText,
      clean_text: cleanText,
      asr_confidence: average(wordScores),
      avg_logprob: Number.isFinite(Number(segment.avg_logprob))
        ? round(Number(segment.avg_logprob))
        : null,
      word_count: Array.isArray(segment.words) ? segment.words.length : null,
      source: "whisperx"
    };
  });
}

export function round(value: number) {
  return Math.round(Number(value || 0) * 1000) / 1000;
}

export function average(values: Array<number | null | undefined>) {
  const nums = values.filter((value): value is number => Number.isFinite(value));
  if (nums.length === 0) return null;

  return round(nums.reduce((sum, value) => sum + value, 0) / nums.length);
}
