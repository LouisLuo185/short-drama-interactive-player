import fs from "node:fs/promises";
import path from "node:path";
import type { WhisperXOutput } from "../types.js";

export async function findWhisperXJsonFiles(asrRoot: string) {
  const root = path.resolve(asrRoot);
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const episodeId = entry.name;
    const candidate = path.join(root, episodeId, `${episodeId}.json`);
    if (await fileExists(candidate)) {
      files.push(candidate);
    }
  }

  return files.sort();
}

export async function loadWhisperXJson(filePath: string): Promise<WhisperXOutput> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as WhisperXOutput;

  if (!Array.isArray(parsed.segments)) {
    throw new Error(`Invalid WhisperX JSON: segments is missing in ${filePath}`);
  }

  return parsed;
}

export function getEpisodeIdFromFile(filePath: string) {
  return path.basename(filePath, ".json");
}

async function fileExists(filePath: string) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}
