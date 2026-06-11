import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { SmartImportEpisode } from "./types.js";
import { runCommand, runShellCommand } from "./processUtils.js";

export async function copyEpisodeVideos(episodes: SmartImportEpisode[]) {
  for (const episode of episodes) {
    console.log(`[PIPELINE] Copy video ${episode.episodeId}: ${episode.sourceFileName}`);
    await fs.mkdir(path.dirname(episode.videoPath), { recursive: true });
    await fs.copyFile(episode.sourceFilePath, episode.videoPath);
  }
}

export async function extractEpisodeAudio(params: {
  dataRoot: string;
  dramaSlug: string;
  episode: SmartImportEpisode;
  commandTimeoutMs?: number;
  heartbeatMs?: number;
}) {
  const outDir = path.join(
    params.dataRoot,
    "1.ffmpeg--audio",
    params.dramaSlug,
    params.episode.episodeId
  );
  const audioPath = path.join(outDir, "audio.wav");
  const metaPath = path.join(outDir, "ffmpeg_meta.json");

  await fs.mkdir(outDir, { recursive: true });
  await runCommand(
    "ffmpeg",
    [
      "-y",
      "-i",
      params.episode.videoPath,
      "-vn",
      "-acodec",
      "pcm_s16le",
      "-ar",
      "16000",
      "-ac",
      "1",
      audioPath
    ],
    {
      label: `ffmpeg audio ${params.episode.episodeId}`,
      timeoutMs: params.commandTimeoutMs,
      heartbeatMs: params.heartbeatMs,
      streamOutput: true
    }
  );
  await fs.writeFile(
    metaPath,
    `${JSON.stringify(
      {
        episode_id: params.episode.episodeId,
        input_video: params.episode.videoPath,
        output_audio: audioPath,
        generated_at: new Date().toISOString()
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  return { audioPath, outDir };
}

export async function runWhisperXForEpisode(params: {
  dataRoot: string;
  dramaSlug: string;
  episode: SmartImportEpisode;
  whisperxCommandTemplate: string;
  commandTimeoutMs?: number;
  heartbeatMs?: number;
}) {
  const audioPath = path.join(
    params.dataRoot,
    "1.ffmpeg--audio",
    params.dramaSlug,
    params.episode.episodeId,
    "audio.wav"
  );
  const outputDir = path.join(
    params.dataRoot,
    "2.whisperX--asr",
    params.dramaSlug,
    params.episode.episodeId
  );

  await fs.mkdir(outputDir, { recursive: true });
  const renderedCommandLine = renderWhisperXCommandTemplate(params.whisperxCommandTemplate, {
    audioPath,
    outputDir,
    episodeId: params.episode.episodeId,
    dramaSlug: params.dramaSlug
  });
  const commandLine = resolveCondaCommandLine(preferActiveCondaEnvCommand(renderedCommandLine));

  try {
    console.log(`[PIPELINE] WhisperX command ${params.episode.episodeId}: ${commandLine}`);
    const result = await runShellCommand(commandLine, {
      label: `whisperx ${params.episode.episodeId}`,
      timeoutMs: params.commandTimeoutMs,
      heartbeatMs: params.heartbeatMs,
      streamOutput: true
    });
    await normalizeWhisperXOutputs(outputDir, params.episode.episodeId);
    await writeWhisperXCommandLog(outputDir, {
      command: commandLine,
      stdout: result.stdout.slice(-4000),
      stderr: result.stderr.slice(-4000),
      status: "success"
    });
  } catch (error) {
    await writeWhisperXCommandLog(outputDir, {
      command: commandLine,
      stdout: "",
      stderr: error instanceof Error ? error.message.slice(-4000) : String(error).slice(-4000),
      status: "error"
    });
    throw error;
  }
}

function preferActiveCondaEnvCommand(commandLine: string) {
  const activeEnv = process.env.CONDA_DEFAULT_ENV;
  if (!activeEnv) return commandLine;

  const match = commandLine.match(/^conda\s+run\s+(?:-n|--name)\s+([^\s]+)\s+(.+)$/i);
  if (!match) return commandLine;

  const [, targetEnv, innerCommand] = match;
  if (targetEnv.toLowerCase() !== activeEnv.toLowerCase()) return commandLine;

  console.log(`[PIPELINE] Active conda env "${activeEnv}" detected; running WhisperX directly without "conda run".`);
  return innerCommand;
}

function resolveCondaCommandLine(commandLine: string) {
  if (!/^conda\s+run\s+/i.test(commandLine)) return commandLine;

  const condaExecutable = findCondaExecutable();
  if (!condaExecutable) return commandLine;

  console.log(`[PIPELINE] Resolved conda executable: ${condaExecutable}`);
  return commandLine.replace(/^conda\b/i, quotePath(condaExecutable));
}

function findCondaExecutable() {
  const homeDir = process.env.USERPROFILE ?? process.env.HOME ?? "";
  const candidates = [
    process.env.CONDA_EXE,
    homeDir ? path.join(homeDir, "anaconda3", "condabin", "conda.bat") : "",
    homeDir ? path.join(homeDir, "miniconda3", "condabin", "conda.bat") : "",
    "D:\\anaconda3\\condabin\\conda.bat",
    "D:\\miniconda3\\condabin\\conda.bat",
    "C:\\ProgramData\\anaconda3\\condabin\\conda.bat",
    "C:\\ProgramData\\miniconda3\\condabin\\conda.bat",
    "/opt/conda/bin/conda",
    "/usr/local/bin/conda"
  ].filter(Boolean) as string[];

  return candidates.find((candidate) => existsSync(candidate));
}

function renderWhisperXCommandTemplate(
  template: string,
  values: {
    audioPath: string;
    outputDir: string;
    episodeId: string;
    dramaSlug: string;
  }
) {
  return template
    .replace(/(["'])?\{audioPath\}\1/g, quotePath(values.audioPath))
    .replace(/(["'])?\{outputDir\}\1/g, quotePath(values.outputDir))
    .replaceAll("{episodeId}", values.episodeId)
    .replaceAll("{dramaSlug}", values.dramaSlug);
}

async function normalizeWhisperXOutputs(outputDir: string, episodeId: string) {
  const entries = await fs.readdir(outputDir, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);

  await copyFirstMatching(files, outputDir, [".json"], `${episodeId}.json`);
  await copyFirstMatching(files, outputDir, [".srt"], `${episodeId}.srt`);
  await copyFirstMatching(files, outputDir, [".txt"], `${episodeId}.txt`);
  await copyFirstMatching(files, outputDir, [".vtt"], `${episodeId}.vtt`);
  await copyIfExists(path.join(outputDir, `${episodeId}.json`), path.join(outputDir, "raw_whisperx.json"));
  await copyIfExists(path.join(outputDir, `${episodeId}.srt`), path.join(outputDir, "raw.srt"));
}

async function writeWhisperXCommandLog(
  outputDir: string,
  payload: {
    command: string;
    stdout: string;
    stderr: string;
    status: "success" | "error";
  }
) {
  await fs.writeFile(
    path.join(outputDir, "whisperx_command.json"),
    `${JSON.stringify(
      {
        ...payload,
        generated_at: new Date().toISOString()
      },
      null,
      2
    )}\n`,
    "utf8"
  );
}

async function copyFirstMatching(
  files: string[],
  outputDir: string,
  extensions: string[],
  targetName: string
) {
  const targetPath = path.join(outputDir, targetName);
  const candidate = files.find((file) => {
    if (file === targetName) return false;
    return extensions.includes(path.extname(file).toLowerCase());
  });

  if (candidate) {
    await fs.copyFile(path.join(outputDir, candidate), targetPath);
  }
}

async function copyIfExists(source: string, target: string) {
  try {
    await fs.copyFile(source, target);
  } catch {
    // Optional normalized output.
  }
}

function quotePath(value: string) {
  if (!/[\s&()<>|^]/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '\\"')}"`;
}
