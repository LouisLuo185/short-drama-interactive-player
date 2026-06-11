import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import type { VideoOcrConfig } from "./types.js";

export async function extractSubtitleFrames(
  videoPath: string,
  tempDir: string,
  config: VideoOcrConfig
) {
  await fs.rm(tempDir, { recursive: true, force: true });
  await fs.mkdir(tempDir, { recursive: true });

  const outputPattern = path.join(tempDir, "frame_%06d.png");
  const cropWidth = `iw*${config.cropRightRatio - config.cropLeftRatio}`;
  const cropX = `iw*${config.cropLeftRatio}`;
  const cropHeight = `ih*${config.cropBottomRatio - config.cropTopRatio}`;
  const cropY = `ih*${config.cropTopRatio}`;
  const filter = [
    `fps=${config.sampleFps}`,
    `crop=${cropWidth}:${cropHeight}:${cropX}:${cropY}`,
    ...buildPreprocessFilters(config)
  ].join(",");

  await runCommand("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    videoPath,
    "-vf",
    filter,
    "-vsync",
    "0",
    outputPattern
  ]);

  const entries = await fs.readdir(tempDir);
  return entries
    .filter((entry) => entry.toLowerCase().endsWith(".png"))
    .sort()
    .map((entry, index) => ({
      path: path.join(tempDir, entry),
      timestamp: roundTime(index / config.sampleFps)
    }));
}

function buildPreprocessFilters(config: VideoOcrConfig) {
  if (config.preprocessMode === "none") {
    return [];
  }

  return [
    `scale=iw*${config.preprocessScale}:ih*${config.preprocessScale}:flags=lanczos`,
    "format=gray",
    "eq=contrast=1.7:brightness=0.04:saturation=0",
    "unsharp=5:5:0.8:3:3:0.4"
  ];
}

function roundTime(value: number) {
  return Math.round(value * 1000) / 1000;
}

function runCommand(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stderr = "";

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr.trim() || `${command} exited with ${code}`));
    });
  });
}
