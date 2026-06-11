export type VideoInfo = {
  width: number;
  height: number;
  fps: number;
  duration: number;
  totalFrames: number;
};

export type VideoOcrConfig = {
  ocrEngine: "tesseract.js" | "external";
  sampleFps: number;
  cropLeftRatio: number;
  cropRightRatio: number;
  cropTopRatio: number;
  cropBottomRatio: number;
  preprocessMode: "none" | "subtitle";
  preprocessScale: number;
  similarityThreshold: number;
  minTextLength: number;
  maxTextLength: number;
  minHanChars: number;
  minOcrConfidence: number;
  maxMergeGapSec: number;
  ocrCommand?: string;
  ocrLanguages: string;
  tesseractPsm: "single_line" | "single_block" | "sparse_text";
  tesseractLangPath?: string;
  tesseractCachePath?: string;
};

export type OcrRecognition = {
  text: string;
  confidence: number | null;
};

export type RawOcrItem = {
  timestamp: number;
  text: string;
  confidence: number | null;
};

export type DialogueSegment = {
  start: number;
  end: number;
  text: string;
};

export type ExportedDialogueSegment = DialogueSegment & {
  line_id: string;
  source: "ocr";
  role_id: null;
  role_name: null;
  emotion: null;
  need_review: false;
};

export type VideoOcrResult = {
  outputDir: string;
  dialogueJsonPath: string;
  srtPath: string;
  metaPath: string;
  sampledFrames: number;
  rawOcrItems: number;
  mergedSegments: number;
};
