import { spawn } from "node:child_process";
import type { VideoInfo } from "./types.js";

type FfprobeOutput = {
  streams?: Array<{
    codec_type?: string;
    width?: number;
    height?: number;
    avg_frame_rate?: string;
    nb_frames?: string;
    duration?: string;
  }>;
  format?: {
    duration?: string;
  };
};

export async function probeVideo(videoPath: string): Promise<VideoInfo> {
  const output = await runCommand("ffprobe", [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_streams",
    "-show_format",
    videoPath
  ]);
  const parsed = JSON.parse(output) as FfprobeOutput;
  const stream = parsed.streams?.find((item) => item.codec_type === "video");

  if (!stream?.width || !stream.height) {
    throw new Error("VIDEO_STREAM_NOT_FOUND");
  }

  const fps = parseFrameRate(stream.avg_frame_rate);
  const duration = Number(stream.duration ?? parsed.format?.duration ?? 0);
  const totalFrames = Number(stream.nb_frames ?? Math.round(duration * fps));

  return {
    width: stream.width,
    height: stream.height,
    fps,
    duration,
    totalFrames
  };
}

function parseFrameRate(value?: string) {
  if (!value || value === "0/0") {
    return 0;
  }

  const [left, right] = value.split("/").map(Number);
  if (!Number.isFinite(left) || !Number.isFinite(right) || right === 0) {
    return 0;
  }

  return left / right;
}

function runCommand(command: string, args: string[]) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }

      reject(new Error(stderr.trim() || `${command} exited with ${code}`));
    });
  });
}
