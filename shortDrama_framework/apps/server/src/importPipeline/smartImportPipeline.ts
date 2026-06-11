import fs from "node:fs/promises";
import path from "node:path";
import { importDrama } from "../services/adminImportService.js";
import { loadWhisperXEpisode, ensureRawCopies } from "../asr/whisperxLoader.js";
import { refineEpisodeSentenceTimeline } from "../asr/sentenceTimelineRefiner.js";
import { analyzeRefinedEpisodeHighlights } from "../highlights/refinedHighlightAnalyzer.js";
import { buildStoryContext } from "../highlights/storyContextBuilder.js";
import { scanDramaFolder } from "./folderScanner.js";
import {
  copyEpisodeVideos,
  extractEpisodeAudio,
  runWhisperXForEpisode
} from "./mediaPipeline.js";
import { generateDramaMetadata } from "./metadataGenerator.js";
import type {
  PipelineStepName,
  PipelineStepReport,
  SmartImportEpisode,
  SmartImportManifest,
  SmartImportPipelineOptions
} from "./types.js";

export async function runSmartImportPipeline(options: SmartImportPipelineOptions) {
  const state = new PipelineState(options);
  await state.init();

  let episodes: SmartImportEpisode[] = [];
  let dramaId: string | undefined;
  let episodeIds: string[] = [];

  await state.step("scan", async () => {
    episodes = await scanDramaFolder({
      sourceDir: options.sourceDir,
      mediaRoot: options.mediaRoot,
      dramaSlug: options.dramaSlug
    });
    console.log(`[PIPELINE] Found ${episodes.length} episode file(s).`);
    await state.writeManifest(buildManifest(options, episodes));
  });

  await state.step("copy_video", async () => {
    if (options.skipCopy) return state.skipCurrent("skip-copy enabled");
    await copyEpisodeVideos(episodes);
    await state.writeManifest(buildManifest(options, episodes, { copied: true }));
  });

  await state.step("database_import", async () => {
    if (options.skipDatabase) return state.skipCurrent("skip-database enabled");
    const result = importDrama({
      title: options.title,
      description: "智能导入流水线生成中，稍后由 LLM 补充简介。",
      tags: ["智能导入"],
      coverUrl: "/media/covers/default.jpg",
      episodes: episodes.map((episode) => ({
        episodeNo: episode.episodeNo,
        title: episode.title,
        videoUrl: episode.videoUrl,
        durationSec: episode.durationSec,
        highlights: []
      }))
    });
    dramaId = result.dramaId;
    episodeIds = result.episodeIds;
  });

  for (const episode of filterEpisodes(episodes, options.episodeIds)) {
    await state.step("ffmpeg_audio", async () => {
      if (options.skipFfmpeg) return state.skipCurrent(`${episode.episodeId}: skip-ffmpeg enabled`);
      await extractEpisodeAudio({
        dataRoot: options.dataRoot,
        dramaSlug: options.dramaSlug,
        episode,
        commandTimeoutMs: options.commandTimeoutMs,
        heartbeatMs: options.heartbeatMs
      });
    }, episode.episodeId);

    await state.step("whisperx", async () => {
      if (options.skipWhisperX) return state.skipCurrent(`${episode.episodeId}: skip-whisperx enabled`);
      if (!options.whisperxCommandTemplate) {
        throw new Error("WhisperX command template is required unless --skip-whisperx is set.");
      }
      await runWhisperXForEpisode({
        dataRoot: options.dataRoot,
        dramaSlug: options.dramaSlug,
        episode,
        whisperxCommandTemplate: options.whisperxCommandTemplate,
        commandTimeoutMs: options.commandTimeoutMs,
        heartbeatMs: options.heartbeatMs
      });
    }, episode.episodeId);

    await state.step("llm_preprocess", async () => {
      if (options.skipRefine) return state.skipCurrent(`${episode.episodeId}: skip-refine enabled`);
      const whisperxEpisode = await loadWhisperXEpisode({
        dataRoot: options.dataRoot,
        dramaSlug: options.dramaSlug,
        episodeId: episode.episodeId
      });
      await ensureRawCopies(whisperxEpisode, options.dataRoot);
      await refineEpisodeSentenceTimeline({
        episode: whisperxEpisode,
        dataRoot: options.dataRoot
      });
    }, episode.episodeId);
  }

  await state.step("story_context", async () => {
    if (options.skipStoryContext) return state.skipCurrent("skip-story-context enabled");
    await buildStoryContext({
      dataRoot: options.dataRoot,
      dramaSlug: options.dramaSlug,
      episodeIds: filterEpisodes(episodes, options.episodeIds).map((episode) => episode.episodeId),
      maxSentencesPerEpisode: options.maxStorySentencesPerEpisode
    });
  });

  await state.step("metadata", async () => {
    if (options.skipMetadata) return state.skipCurrent("skip-metadata enabled");
    const metadata = await generateDramaMetadata({
      dataRoot: options.dataRoot,
      dramaSlug: options.dramaSlug,
      title: options.title,
      dramaId
    });
    await state.writeManifest(buildManifest(options, episodes, {
      copied: !options.skipCopy,
      generated: {
        description: metadata.description,
        tags: metadata.tags,
        summary: metadata.short_summary ?? "",
        generatedAt: metadata.generated_at
      }
    }));
  });

  for (const episode of filterEpisodes(episodes, options.episodeIds)) {
    await state.step("highlight", async () => {
      if (options.skipHighlight) return state.skipCurrent(`${episode.episodeId}: skip-highlight enabled`);
      await analyzeRefinedEpisodeHighlights({
        dataRoot: options.dataRoot,
        dramaSlug: options.dramaSlug,
        episodeId: episode.episodeId
      });
    }, episode.episodeId);
  }

  await state.finish({
    dramaSlug: options.dramaSlug,
    dramaId,
    episodeIds,
    manifestPath: state.manifestPath,
    reportPath: state.reportPath
  });

  return {
    dramaSlug: options.dramaSlug,
    dramaId,
    episodeIds,
    manifestPath: state.manifestPath,
    reportPath: state.reportPath
  };
}

class PipelineState {
  private reports: PipelineStepReport[] = [];
  private currentStep: PipelineStepReport | null = null;
  readonly sourceDir: string;
  readonly manifestPath: string;
  readonly reportPath: string;

  constructor(private options: SmartImportPipelineOptions) {
    this.sourceDir = path.join(options.dataRoot, "0.source", options.dramaSlug);
    this.manifestPath = path.join(this.sourceDir, "import_manifest.json");
    this.reportPath = path.join(this.sourceDir, "pipeline_report.json");
  }

  async init() {
    await fs.mkdir(this.sourceDir, { recursive: true });
  }

  async step(step: PipelineStepName, fn: () => Promise<unknown>, episodeId?: string) {
    const label = episodeId ? `${step} ${episodeId}` : step;
    const startedMs = Date.now();
    const report: PipelineStepReport = {
      step,
      status: "pending",
      message: episodeId,
      startedAt: new Date().toISOString()
    };
    this.currentStep = report;
    this.reports.push(report);
    console.log(`[PIPELINE] START ${label}`);

    const heartbeatTimer = this.options.heartbeatMs
      ? setInterval(() => {
          const elapsedSec = Math.round((Date.now() - startedMs) / 1000);
          console.log(`[PIPELINE] RUNNING ${label}: ${elapsedSec}s elapsed...`);
        }, this.options.heartbeatMs)
      : null;

    try {
      await fn();
      if (report.status === "pending") {
        report.status = "success";
      }
      const elapsedSec = Math.round((Date.now() - startedMs) / 1000);
      console.log(`[PIPELINE] ${report.status === "skipped" ? "SKIP" : "DONE"} ${label} (${elapsedSec}s)`);
    } catch (error) {
      report.status = "error";
      report.message = `${episodeId ? `${episodeId}: ` : ""}${error instanceof Error ? error.message : String(error)}`;
      console.error(`[PIPELINE] ERROR ${label}: ${report.message}`);
      throw error;
    } finally {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      report.finishedAt = new Date().toISOString();
      this.currentStep = null;
      await this.writeReport();
    }
  }

  skipCurrent(message: string) {
    if (this.currentStep) {
      this.currentStep.status = "skipped";
      this.currentStep.message = message;
    }
  }

  async writeManifest(manifest: SmartImportManifest) {
    await fs.writeFile(this.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  }

  async finish(extra: Record<string, unknown>) {
    await this.writeReport(extra);
  }

  private async writeReport(extra: Record<string, unknown> = {}) {
    await fs.writeFile(
      this.reportPath,
      `${JSON.stringify(
        {
          schemaVersion: "1.0",
          dramaSlug: this.options.dramaSlug,
          sourceDir: this.options.sourceDir,
          updatedAt: new Date().toISOString(),
          steps: this.reports,
          ...extra
        },
        null,
        2
      )}\n`,
      "utf8"
    );
  }
}

function buildManifest(
  options: SmartImportPipelineOptions,
  episodes: SmartImportEpisode[],
  extra: {
    copied?: boolean;
    generated?: SmartImportManifest["generated"];
  } = {}
): SmartImportManifest {
  return {
    schemaVersion: "2.0",
    drama: {
      slug: options.dramaSlug,
      title: options.title,
      description: extra.generated?.description ?? "",
      tags: extra.generated?.tags ?? [],
      coverUrl: "/media/covers/default.jpg"
    },
    source: {
      type: "local_folder",
      folderName: path.basename(options.sourceDir),
      originalPath: options.sourceDir
    },
    episodes: episodes.map((episode) => ({
      episodeNo: episode.episodeNo,
      episodeId: episode.episodeId,
      title: episode.title,
      sourceFileName: episode.sourceFileName,
      videoUrl: episode.videoUrl,
      durationSec: episode.durationSec,
      status: {
        copied: Boolean(extra.copied),
        audioExtracted: false,
        asrDone: false,
        llmPreprocessDone: false,
        highlightDone: false
      }
    })),
    pipeline: {
      runFfmpeg: !options.skipFfmpeg,
      runWhisperX: !options.skipWhisperX,
      runLlmPreprocess: !options.skipRefine,
      runStoryContext: !options.skipStoryContext,
      runHighlight: !options.skipHighlight,
      generateMetadata: !options.skipMetadata
    },
    generated: extra.generated ?? {
      description: "",
      tags: [],
      summary: "",
      generatedAt: ""
    }
  };
}

function filterEpisodes(episodes: SmartImportEpisode[], episodeIds?: string[]) {
  if (!episodeIds || episodeIds.length === 0) return episodes;
  const allowed = new Set(episodeIds);
  return episodes.filter((episode) => allowed.has(episode.episodeId));
}
