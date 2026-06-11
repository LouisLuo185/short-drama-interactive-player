import fs from "node:fs/promises";
import path from "node:path";
import { callDoubao } from "../llm/doubaoClient.js";
import type { HighlightCandidate, HighlightWindow } from "../types.js";
import { buildHighlightMessages } from "./highlightPrompt.js";
import { parseHighlightCandidate } from "./modelOutputParser.js";

export type AnalyzeOptions = {
  inputRoot: string;
  outRoot: string;
  episodeId?: string;
  limit?: number;
  minScore?: number;
};

type HighlightWindowsFile = {
  episode_id: string;
  windows: HighlightWindow[];
};

export async function analyzeHighlightsWithDoubao(options: AnalyzeOptions) {
  const inputRoot = path.resolve(options.inputRoot);
  const outRoot = path.resolve(options.outRoot);
  const episodeIds = options.episodeId
    ? [options.episodeId]
    : await findEpisodeIds(inputRoot);
  const summaries = [];

  for (const episodeId of episodeIds) {
    const windowsPath = path.join(inputRoot, episodeId, "highlight_windows.json");
    const windowsFile = JSON.parse(await fs.readFile(windowsPath, "utf8")) as HighlightWindowsFile;
    const windows = windowsFile.windows.slice(0, options.limit);
    const episodeOutDir = path.join(outRoot, episodeId);
    const candidates: HighlightCandidate[] = [];
    const rawLines: string[] = [];

    await fs.mkdir(episodeOutDir, { recursive: true });

    for (const window of windows) {
      try {
        const rawOutput = await callDoubao(buildHighlightMessages(window), {
          temperature: 0.2,
          maxTokens: 1200
        });
        const candidate = parseHighlightCandidate(window, rawOutput);
        candidates.push(candidate);
        rawLines.push(JSON.stringify({ window_id: window.window_id, raw_output: rawOutput }));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const candidate = parseHighlightCandidate(
          window,
          JSON.stringify({
            is_highlight: false,
            highlight_type: "普通片段",
            highlight_score: 0,
            reason: `Doubao 调用失败：${message}`
          })
        );
        candidates.push(candidate);
        rawLines.push(JSON.stringify({ window_id: window.window_id, error: message }));
      }
    }

    const minScore = options.minScore ?? 0.7;
    const strongHighlights = candidates.filter(
      (candidate) => candidate.is_highlight && candidate.highlight_score >= minScore
    );
    const summary = {
      episode_id: episodeId,
      analyzed_windows: windows.length,
      candidate_count: candidates.length,
      strong_highlight_count: strongHighlights.length,
      min_score: minScore,
      generated_at: new Date().toISOString()
    };

    await writeJson(path.join(episodeOutDir, "highlight_candidates.json"), {
      episode_id: episodeId,
      candidates,
      strong_highlights: strongHighlights
    });
    await fs.writeFile(path.join(episodeOutDir, "raw_responses.jsonl"), `${rawLines.join("\n")}\n`, "utf8");
    await writeJson(path.join(episodeOutDir, "summary.json"), summary);
    summaries.push(summary);
  }

  await fs.mkdir(outRoot, { recursive: true });
  await writeJson(path.join(outRoot, "manifest.json"), {
    generated_at: new Date().toISOString(),
    episodes: summaries
  });

  return summaries;
}

async function findEpisodeIds(inputRoot: string) {
  const entries = await fs.readdir(inputRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("ep_"))
    .map((entry) => entry.name)
    .sort();
}

async function writeJson(filePath: string, value: unknown) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
