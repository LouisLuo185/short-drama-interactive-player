import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exportOcrOutputs } from "./exporters.js";
import { extractSubtitleFrames } from "./frameExtractor.js";
import { OcrEngine } from "./ocrEngine.js";
import { mergeSubtitleItems } from "./subtitleMerger.js";
import { isUsefulText } from "./textUtils.js";
import type { RawOcrItem, VideoOcrConfig, VideoOcrResult } from "./types.js";
import { probeVideo } from "./videoProbe.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, "../../..");

export type RunVideoOcrOptions = {
  video: string;
  episodeId: string;
  outputDir?: string;
  config?: Partial<VideoOcrConfig>;
  keepTemp?: boolean;
};

export const defaultVideoOcrConfig: VideoOcrConfig = {
  ocrEngine: process.env.VIDEO_OCR_ENGINE === "external" ? "external" : "tesseract.js",
  sampleFps: 2,
  cropLeftRatio: 0.08,
  cropRightRatio: 0.92,
  cropTopRatio: 0.62,
  cropBottomRatio: 0.8,
  preprocessMode: "subtitle",
  preprocessScale: 2.5,
  similarityThreshold: 0.85,
  minTextLength: 2,
  maxTextLength: 36,
  minHanChars: 2,
  minOcrConfidence: 25,
  maxMergeGapSec: 1,
  ocrCommand: process.env.VIDEO_OCR_COMMAND,
  ocrLanguages: process.env.VIDEO_OCR_LANGUAGES ?? "chi_sim",
  tesseractPsm: "single_line",
  tesseractLangPath: process.env.VIDEO_OCR_TESSERACT_LANG_PATH,
  tesseractCachePath: process.env.VIDEO_OCR_TESSERACT_CACHE_PATH
};

export async function runVideoOcrPreprocess(options: RunVideoOcrOptions): Promise<VideoOcrResult> {
  const config = {
    ...defaultVideoOcrConfig,
    ...options.config
  };
  validateOptions(options, config);

  const videoPath = resolveInputVideoPath(options.video);
  await assertFileExists(videoPath);

  const outputDir = path.resolve(
    options.outputDir ?? path.join(serverRoot, "data", "ocr", options.episodeId)
  );
  const tempDir = path.join(serverRoot, "data", "ocr-temp", `${options.episodeId}-${Date.now()}`);

  console.log(`[INFO] Loading video: ${videoPath}`);
  const videoInfo = await probeVideo(videoPath);
  console.log(
    `[INFO] Video duration: ${videoInfo.duration.toFixed(2)}s, size: ${videoInfo.width}x${videoInfo.height}`
  );
  console.log(`[INFO] Sampling fps: ${config.sampleFps}`);

  const frames = await extractSubtitleFrames(videoPath, tempDir, config);
  console.log(`[INFO] Sampled frames: ${frames.length}`);
  console.log("[INFO] Running OCR...");

  const engine = new OcrEngine(config);
  const rawItems: RawOcrItem[] = [];

  try {
    for (const frame of frames) {
      const recognition = await engine.recognize(frame.path);
      if (
        isUsefulText(recognition.text, {
          minTextLength: config.minTextLength,
          maxTextLength: config.maxTextLength,
          minHanChars: config.minHanChars,
          minOcrConfidence: config.minOcrConfidence,
          confidence: recognition.confidence
        })
      ) {
        rawItems.push({
          timestamp: frame.timestamp,
          text: recognition.text,
          confidence: recognition.confidence
        });
      }
    }
  } finally {
    await engine.terminate();
  }

  const segments = mergeSubtitleItems(rawItems, config);
  const paths = await exportOcrOutputs({
    outputDir,
    episodeId: options.episodeId,
    sourceVideo: options.video,
    segments,
    videoInfo,
    config,
    stats: {
      sampledFrames: frames.length,
      rawOcrItems: rawItems.length,
      mergedSegments: segments.length
    }
  });

  if (!options.keepTemp) {
    await fs.rm(tempDir, { recursive: true, force: true });
  }

  console.log(`[INFO] Raw OCR items: ${rawItems.length}`);
  console.log(`[INFO] Merged subtitle segments: ${segments.length}`);
  console.log(`[INFO] Saved: ${paths.dialogueJsonPath}`);
  console.log(`[INFO] Saved: ${paths.srtPath}`);
  console.log(`[INFO] Saved: ${paths.metaPath}`);

  return {
    outputDir,
    dialogueJsonPath: paths.dialogueJsonPath,
    srtPath: paths.srtPath,
    metaPath: paths.metaPath,
    sampledFrames: frames.length,
    rawOcrItems: rawItems.length,
    mergedSegments: segments.length
  };
}

function validateOptions(options: RunVideoOcrOptions, config: VideoOcrConfig) {
  if (!options.video?.trim()) {
    throw new Error("--video is required");
  }

  if (!options.episodeId?.trim()) {
    throw new Error("--episode-id is required");
  }

  if (!Number.isFinite(config.sampleFps) || config.sampleFps <= 0) {
    throw new Error("--fps must be greater than 0");
  }

  if (
    config.cropLeftRatio < 0 ||
    config.cropRightRatio > 1 ||
    config.cropLeftRatio >= config.cropRightRatio ||
    config.cropTopRatio < 0 ||
    config.cropBottomRatio > 1 ||
    config.cropTopRatio >= config.cropBottomRatio
  ) {
    throw new Error("Crop ratios must be ordered and within 0-1");
  }

  if (config.similarityThreshold < 0 || config.similarityThreshold > 1) {
    throw new Error("--similarity-threshold must be within 0-1");
  }

  if (config.ocrEngine !== "tesseract.js" && config.ocrEngine !== "external") {
    throw new Error("--ocr-engine must be tesseract.js or external");
  }

  if (!Number.isInteger(config.minTextLength) || config.minTextLength < 1) {
    throw new Error("--min-text-length must be a positive integer");
  }

  if (!Number.isInteger(config.maxTextLength) || config.maxTextLength < config.minTextLength) {
    throw new Error("--max-text-length must be greater than or equal to --min-text-length");
  }

  if (!Number.isInteger(config.minHanChars) || config.minHanChars < 0) {
    throw new Error("--min-han-chars must be a non-negative integer");
  }

  if (config.minOcrConfidence < 0 || config.minOcrConfidence > 100) {
    throw new Error("--min-ocr-confidence must be within 0-100");
  }

  if (config.preprocessMode !== "none" && config.preprocessMode !== "subtitle") {
    throw new Error("--preprocess-mode must be none or subtitle");
  }

  if (!Number.isFinite(config.preprocessScale) || config.preprocessScale < 1) {
    throw new Error("--preprocess-scale must be greater than or equal to 1");
  }

  if (
    config.tesseractPsm !== "single_line" &&
    config.tesseractPsm !== "single_block" &&
    config.tesseractPsm !== "sparse_text"
  ) {
    throw new Error("--tesseract-psm must be single_line, single_block, or sparse_text");
  }
}

function resolveInputVideoPath(value: string) {
  if (value.startsWith("/media/")) {
    return path.join(serverRoot, value.slice(1));
  }

  if (path.isAbsolute(value)) {
    return value;
  }

  return path.resolve(serverRoot, value);
}

async function assertFileExists(filePath: string) {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      throw new Error("not a file");
    }
  } catch {
    throw new Error(`Video file does not exist: ${filePath}`);
  }
}
