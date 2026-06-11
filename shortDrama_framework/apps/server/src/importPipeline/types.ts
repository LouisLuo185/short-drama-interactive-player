export type SmartImportPipelineOptions = {
  sourceDir: string;
  dramaSlug: string;
  title: string;
  configPath?: string;
  dataRoot: string;
  mediaRoot: string;
  whisperxCommandTemplate?: string;
  commandTimeoutMs?: number;
  heartbeatMs?: number;
  episodeIds?: string[];
  skipCopy?: boolean;
  skipDatabase?: boolean;
  skipFfmpeg?: boolean;
  skipWhisperX?: boolean;
  skipRefine?: boolean;
  skipStoryContext?: boolean;
  skipMetadata?: boolean;
  skipHighlight?: boolean;
  maxStorySentencesPerEpisode?: number;
};

export type SmartImportEpisode = {
  episodeNo: number;
  episodeId: string;
  title: string;
  sourceFilePath: string;
  sourceFileName: string;
  videoFileName: string;
  videoPath: string;
  videoUrl: string;
  durationSec: number;
};

export type PipelineStepName =
  | "scan"
  | "copy_video"
  | "database_import"
  | "ffmpeg_audio"
  | "whisperx"
  | "llm_preprocess"
  | "story_context"
  | "metadata"
  | "highlight";

export type PipelineStepStatus = "pending" | "skipped" | "success" | "error";

export type PipelineStepReport = {
  step: PipelineStepName;
  status: PipelineStepStatus;
  message?: string;
  startedAt?: string;
  finishedAt?: string;
};

export type SmartImportManifest = {
  schemaVersion: "2.0";
  drama: {
    slug: string;
    title: string;
    description: string;
    tags: string[];
    coverUrl: string;
  };
  source: {
    type: "local_folder";
    folderName: string;
    originalPath: string;
  };
  episodes: Array<{
    episodeNo: number;
    episodeId: string;
    title: string;
    sourceFileName: string;
    videoUrl: string;
    durationSec: number;
    status: {
      copied: boolean;
      audioExtracted: boolean;
      asrDone: boolean;
      llmPreprocessDone: boolean;
      highlightDone: boolean;
    };
  }>;
  pipeline: {
    runFfmpeg: boolean;
    runWhisperX: boolean;
    runLlmPreprocess: boolean;
    runStoryContext: boolean;
    runHighlight: boolean;
    generateMetadata: boolean;
  };
  generated: {
    description: string;
    tags: string[];
    summary: string;
    generatedAt: string;
  };
};
