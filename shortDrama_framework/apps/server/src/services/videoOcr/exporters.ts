import fs from "node:fs/promises";
import path from "node:path";
import type { DialogueSegment, ExportedDialogueSegment, VideoInfo, VideoOcrConfig } from "./types.js";

export async function exportOcrOutputs(input: {
  outputDir: string;
  episodeId: string;
  sourceVideo: string;
  segments: DialogueSegment[];
  videoInfo: VideoInfo;
  config: VideoOcrConfig;
  stats: {
    sampledFrames: number;
    rawOcrItems: number;
    mergedSegments: number;
  };
}) {
  await fs.mkdir(input.outputDir, { recursive: true });

  const exportedSegments = input.segments.map<ExportedDialogueSegment>((segment, index) => ({
    line_id: `${input.episodeId}_line_${String(index + 1).padStart(4, "0")}`,
    start: segment.start,
    end: segment.end,
    text: segment.text,
    source: "ocr",
    role_id: null,
    role_name: null,
    emotion: null,
    need_review: false
  }));

  const dialogueJsonPath = path.join(input.outputDir, "dialogue_segments.json");
  const srtPath = path.join(input.outputDir, "ocr.srt");
  const metaPath = path.join(input.outputDir, "meta.json");

  await fs.writeFile(
    dialogueJsonPath,
    `${JSON.stringify(
      {
        episode_id: input.episodeId,
        source_video: input.sourceVideo,
        segments: exportedSegments
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  await fs.writeFile(srtPath, toSrt(input.segments), "utf8");
  await fs.writeFile(
    metaPath,
    `${JSON.stringify(
      {
        episode_id: input.episodeId,
        source_video: input.sourceVideo,
        video_info: input.videoInfo,
        ocr_config: {
          ocr_engine: input.config.ocrEngine,
          sample_fps: input.config.sampleFps,
          crop_left_ratio: input.config.cropLeftRatio,
          crop_right_ratio: input.config.cropRightRatio,
          crop_top_ratio: input.config.cropTopRatio,
          crop_bottom_ratio: input.config.cropBottomRatio,
          preprocess_mode: input.config.preprocessMode,
          preprocess_scale: input.config.preprocessScale,
          similarity_threshold: input.config.similarityThreshold,
          min_text_length: input.config.minTextLength,
          max_text_length: input.config.maxTextLength,
          min_han_chars: input.config.minHanChars,
          min_ocr_confidence: input.config.minOcrConfidence,
          max_merge_gap_sec: input.config.maxMergeGapSec,
          ocr_command: input.config.ocrCommand ?? null,
          ocr_languages: input.config.ocrLanguages,
          tesseract_psm: input.config.tesseractPsm,
          tesseract_lang_path: input.config.tesseractLangPath ?? null,
          tesseract_cache_path: input.config.tesseractCachePath ?? null
        },
        stats: input.stats
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  return {
    dialogueJsonPath,
    srtPath,
    metaPath
  };
}

function toSrt(segments: DialogueSegment[]) {
  return segments
    .map(
      (segment, index) =>
        `${index + 1}\n${formatSrtTime(segment.start)} --> ${formatSrtTime(segment.end)}\n${segment.text}\n`
    )
    .join("\n");
}

function formatSrtTime(seconds: number) {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const ms = totalMs % 1000;
  const totalSeconds = Math.floor(totalMs / 1000);
  const sec = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const min = totalMinutes % 60;
  const hour = Math.floor(totalMinutes / 60);

  return `${pad(hour)}:${pad(min)}:${pad(sec)},${String(ms).padStart(3, "0")}`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
