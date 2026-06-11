import { runVideoOcrPreprocess } from "../services/videoOcr/videoOcrPreprocess.js";
import type { VideoOcrConfig } from "../services/videoOcr/types.js";

type CliOptions = {
  video?: string;
  episodeId?: string;
  outputDir?: string;
  keepTemp?: boolean;
  config: Partial<VideoOcrConfig>;
};

const options = parseArgs(process.argv.slice(2));

runVideoOcrPreprocess({
  video: options.video ?? "",
  episodeId: options.episodeId ?? "",
  outputDir: options.outputDir,
  keepTemp: options.keepTemp,
  config: options.config
}).catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ERROR] ${message}`);
  process.exitCode = 1;
});

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    config: {}
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    switch (arg) {
      case "--video":
        options.video = requireValue(arg, next);
        index += 1;
        break;
      case "--episode-id":
        options.episodeId = requireValue(arg, next);
        index += 1;
        break;
      case "--output-dir":
        options.outputDir = requireValue(arg, next);
        index += 1;
        break;
      case "--fps":
        options.config.sampleFps = Number(requireValue(arg, next));
        index += 1;
        break;
      case "--ocr-engine":
        options.config.ocrEngine = parseOcrEngine(requireValue(arg, next));
        index += 1;
        break;
      case "--crop-left-ratio":
        options.config.cropLeftRatio = Number(requireValue(arg, next));
        index += 1;
        break;
      case "--crop-right-ratio":
        options.config.cropRightRatio = Number(requireValue(arg, next));
        index += 1;
        break;
      case "--crop-top-ratio":
        options.config.cropTopRatio = Number(requireValue(arg, next));
        index += 1;
        break;
      case "--crop-bottom-ratio":
        options.config.cropBottomRatio = Number(requireValue(arg, next));
        index += 1;
        break;
      case "--preprocess-mode":
        options.config.preprocessMode = parsePreprocessMode(requireValue(arg, next));
        index += 1;
        break;
      case "--preprocess-scale":
        options.config.preprocessScale = Number(requireValue(arg, next));
        index += 1;
        break;
      case "--similarity-threshold":
        options.config.similarityThreshold = Number(requireValue(arg, next));
        index += 1;
        break;
      case "--min-text-length":
        options.config.minTextLength = Number(requireValue(arg, next));
        index += 1;
        break;
      case "--max-text-length":
        options.config.maxTextLength = Number(requireValue(arg, next));
        index += 1;
        break;
      case "--min-han-chars":
        options.config.minHanChars = Number(requireValue(arg, next));
        index += 1;
        break;
      case "--min-ocr-confidence":
        options.config.minOcrConfidence = Number(requireValue(arg, next));
        index += 1;
        break;
      case "--max-merge-gap-sec":
        options.config.maxMergeGapSec = Number(requireValue(arg, next));
        index += 1;
        break;
      case "--ocr-command":
        options.config.ocrCommand = requireValue(arg, next);
        index += 1;
        break;
      case "--ocr-languages":
        options.config.ocrLanguages = requireValue(arg, next);
        index += 1;
        break;
      case "--tesseract-psm":
        options.config.tesseractPsm = parseTesseractPsm(requireValue(arg, next));
        index += 1;
        break;
      case "--tesseract-lang-path":
        options.config.tesseractLangPath = requireValue(arg, next);
        index += 1;
        break;
      case "--tesseract-cache-path":
        options.config.tesseractCachePath = requireValue(arg, next);
        index += 1;
        break;
      case "--keep-temp":
        options.keepTemp = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function requireValue(name: string, value?: string) {
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value`);
  }

  return value;
}

function parseOcrEngine(value: string) {
  if (value === "tesseract.js" || value === "external") {
    return value;
  }

  throw new Error("--ocr-engine must be tesseract.js or external");
}

function parsePreprocessMode(value: string) {
  if (value === "none" || value === "subtitle") {
    return value;
  }

  throw new Error("--preprocess-mode must be none or subtitle");
}

function parseTesseractPsm(value: string) {
  if (value === "single_line" || value === "single_block" || value === "sparse_text") {
    return value;
  }

  throw new Error("--tesseract-psm must be single_line, single_block, or sparse_text");
}
