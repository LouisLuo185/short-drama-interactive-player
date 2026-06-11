import fs from "node:fs/promises";
import path from "node:path";
import { callDoubao } from "../llm/doubaoClient.js";
import { buildSentenceRefineMessages } from "./sentenceRefinePrompt.js";
import { writeRefinedSrt } from "./srtWriter.js";
import type {
  RefinedSentence,
  RefinedSentenceDraft,
  RefinedSentencesFile,
  WhisperXEpisode,
  WhisperXSegment,
  WhisperXWord
} from "./types.js";

export async function refineEpisodeSentenceTimeline(params: {
  episode: WhisperXEpisode;
  dataRoot: string;
  limitSegments?: number;
}) {
  const allSentences: RefinedSentence[] = [];
  const debug: unknown[] = [];
  const segments = params.episode.segments.slice(0, params.limitSegments);

  for (const [segmentIndex, segment] of segments.entries()) {
    const sourceSegmentId = String(
      segment.id ?? `${params.episode.episodeId}_seg_${String(segmentIndex + 1).padStart(3, "0")}`
    );
    const drafts = await refineSegmentDrafts(params.episode.episodeId, sourceSegmentId, segment);
    const aligned = alignSentencesToWords({
      episodeId: params.episode.episodeId,
      sourceSegmentId,
      sourceSegment: segment,
      drafts,
      sentenceOffset: allSentences.length
    });

    allSentences.push(...aligned);
    debug.push({
      source_segment_id: sourceSegmentId,
      raw_text: segment.text,
      drafts,
      aligned_count: aligned.length
    });
  }

  const timeSource = allSentences.some((sentence) => sentence.time_source === "whisperx_word_timestamps")
    ? "whisperx_word_timestamps"
    : "estimated_by_char_ratio";
  const output: RefinedSentencesFile = {
    schema_version: "1.0",
    episode_id: params.episode.episodeId,
    source: {
      asr_engine: "whisperX",
      time_source: timeSource
    },
    sentences: allSentences
  };
  const episodeDir = path.join(
    params.dataRoot,
    "3.doubao--llm_preprocess",
    params.episode.dramaSlug,
    params.episode.episodeId
  );

  await fs.mkdir(episodeDir, { recursive: true });
  await fs.writeFile(
    path.join(episodeDir, "refined_sentences.json"),
    `${JSON.stringify(output, null, 2)}\n`,
    "utf8"
  );
  await fs.writeFile(path.join(episodeDir, "refined.srt"), writeRefinedSrt(allSentences), "utf8");
  await fs.writeFile(
    path.join(episodeDir, "sentence_refine_debug.json"),
    `${JSON.stringify({ episode_id: params.episode.episodeId, debug }, null, 2)}\n`,
    "utf8"
  );

  return output;
}

async function refineSegmentDrafts(
  episodeId: string,
  sourceSegmentId: string,
  segment: WhisperXSegment
): Promise<RefinedSentenceDraft[]> {
  try {
    const raw = await callDoubao(buildSentenceRefineMessages({ episodeId, sourceSegmentId, segment }), {
      temperature: 0.15,
      maxTokens: 1200
    });
    const parsed = parseJsonObject(raw);
    const sentences = Array.isArray(parsed?.sentences) ? parsed.sentences : [];
    const drafts = sentences
      .map((sentence) => normalizeDraft(sentence))
      .filter((sentence): sentence is RefinedSentenceDraft => Boolean(sentence?.text));

    return drafts.length > 0 ? drafts : fallbackDraft(segment.text);
  } catch (error) {
    console.warn(`[WARN] Sentence refine failed for ${sourceSegmentId}:`, error);
    return fallbackDraft(segment.text);
  }
}

function parseJsonObject(raw: string) {
  try {
    return JSON.parse(raw) as { sentences?: unknown[] };
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]) as { sentences?: unknown[] };
    } catch {
      return null;
    }
  }
}

function normalizeDraft(value: unknown): RefinedSentenceDraft | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const text = typeof record.text === "string" ? record.text.trim() : "";
  if (!text) return null;

  return {
    text,
    role: normalizeRole(record.role),
    sentence_type: normalizeSentenceType(record.sentence_type),
    is_potential_trigger: Boolean(record.is_potential_trigger)
  };
}

function fallbackDraft(text: string): RefinedSentenceDraft[] {
  return [
    {
      text: text.trim(),
      role: "unknown",
      sentence_type: "unknown",
      is_potential_trigger: false
    }
  ];
}

function alignSentencesToWords(params: {
  episodeId: string;
  sourceSegmentId: string;
  sourceSegment: WhisperXSegment;
  drafts: RefinedSentenceDraft[];
  sentenceOffset: number;
}): RefinedSentence[] {
  const words = normalizeWords(params.sourceSegment.words);
  let searchCursor = 0;
  let estimatedCursor = params.sourceSegment.start;

  return params.drafts.map((draft, index) => {
    const normalizedSentence = normalizeTextForMatch(draft.text);
    const normalizedWords = words.map((word) => normalizeTextForMatch(word.word));
    const joinedWords = normalizedWords.join("");
    const matchIndex = normalizedSentence ? joinedWords.indexOf(normalizedSentence, searchCursor) : -1;
    const wordSpan =
      matchIndex >= 0
        ? findWordSpan(normalizedWords, matchIndex, normalizedSentence.length)
        : null;
    const hasUsableWords = words.length > 0 && words.every((word) => hasTime(word));
    let start = params.sourceSegment.start;
    let end = params.sourceSegment.end;
    let alignmentStatus: RefinedSentence["alignment_status"] = "estimated";
    let timeSource: RefinedSentence["time_source"] = "estimated_by_char_ratio";

    if (wordSpan && hasUsableWords) {
      start = words[wordSpan.startWordIndex].start;
      end = words[wordSpan.endWordIndex].end;
      searchCursor = matchIndex + Math.max(normalizedSentence.length, 1);
      alignmentStatus = "matched";
      timeSource = "whisperx_word_timestamps";
    } else {
      const estimated = estimateSentenceTime(params.sourceSegment, draft.text, params.drafts, index, estimatedCursor);
      start = estimated.start;
      end = estimated.end;
      estimatedCursor = end;
    }

    return {
      sentence_id: `${params.episodeId}_sent_${String(params.sentenceOffset + index + 1).padStart(4, "0")}`,
      episode_id: params.episodeId,
      source_segment_id: params.sourceSegmentId,
      start: round(start),
      end: round(Math.max(end, start + 0.1)),
      duration: round(Math.max(end - start, 0.1)),
      text: draft.text,
      raw_text: params.sourceSegment.text,
      role: draft.role ?? "unknown",
      sentence_type: draft.sentence_type ?? "unknown",
      is_potential_trigger: Boolean(draft.is_potential_trigger),
      alignment_status: alignmentStatus,
      time_source: timeSource
    };
  });
}

function normalizeWords(words?: WhisperXWord[]) {
  return (words ?? [])
    .filter((word) => word.word)
    .map((word) => ({
      word: word.word,
      start: Number(word.start),
      end: Number(word.end)
    }));
}

function findWordSpan(words: string[], charStart: number, charLength: number) {
  let cursor = 0;
  let startWordIndex = -1;
  let endWordIndex = -1;
  const charEnd = charStart + charLength;

  for (const [index, word] of words.entries()) {
    const nextCursor = cursor + word.length;
    if (startWordIndex < 0 && charStart >= cursor && charStart < nextCursor) {
      startWordIndex = index;
    }
    if (charEnd > cursor && charEnd <= nextCursor) {
      endWordIndex = index;
      break;
    }
    cursor = nextCursor;
  }

  if (startWordIndex < 0 || endWordIndex < 0) return null;
  return { startWordIndex, endWordIndex };
}

function estimateSentenceTime(
  segment: WhisperXSegment,
  text: string,
  allDrafts: RefinedSentenceDraft[],
  index: number,
  cursor: number
) {
  const totalChars = allDrafts.reduce((sum, draft) => sum + normalizeTextForMatch(draft.text).length, 0) || 1;
  const currentChars = normalizeTextForMatch(text).length || 1;
  const duration = ((segment.end - segment.start) * currentChars) / totalChars;
  const remainingSentences = allDrafts.length - index;
  const minEnd = cursor + 0.3;
  const maxEnd = segment.end - Math.max(remainingSentences - 1, 0) * 0.3;

  return {
    start: cursor,
    end: Math.max(minEnd, Math.min(cursor + duration, maxEnd))
  };
}

function normalizeTextForMatch(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\s，。！？、,.!?：:；;“”"'《》（）()【】\[\]-]/g, "")
    .toLowerCase();
}

function hasTime(word: { start: number; end: number }) {
  return Number.isFinite(word.start) && Number.isFinite(word.end);
}

function normalizeRole(value: unknown): RefinedSentenceDraft["role"] {
  return value === "dialogue" || value === "narration" ? value : "unknown";
}

function normalizeSentenceType(value: unknown): RefinedSentenceDraft["sentence_type"] {
  const allowed = ["statement", "question", "exclamation", "turning_point", "action", "unknown"];
  return typeof value === "string" && allowed.includes(value)
    ? (value as RefinedSentenceDraft["sentence_type"])
    : "unknown";
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
