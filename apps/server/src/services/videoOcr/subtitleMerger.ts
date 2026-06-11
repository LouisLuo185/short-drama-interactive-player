import type { DialogueSegment, RawOcrItem, VideoOcrConfig } from "./types.js";
import { similarity } from "./textUtils.js";

export function mergeSubtitleItems(items: RawOcrItem[], config: VideoOcrConfig): DialogueSegment[] {
  const sorted = [...items].sort((a, b) => a.timestamp - b.timestamp);
  const groups: RawOcrItem[][] = [];

  for (const item of sorted) {
    const current = groups.at(-1);

    if (!current) {
      groups.push([item]);
      continue;
    }

    const previous = current.at(-1);
    const textScore = similarity(previous?.text ?? "", item.text);
    const gap = item.timestamp - (previous?.timestamp ?? item.timestamp);

    if (textScore >= config.similarityThreshold && gap <= config.maxMergeGapSec) {
      current.push(item);
    } else {
      groups.push([item]);
    }
  }

  return groups.map((group) => ({
    start: roundTime(group[0].timestamp),
    end: roundTime(group[group.length - 1].timestamp + 1 / config.sampleFps),
    text: chooseRepresentativeText(group.map((item) => item.text))
  }));
}

function chooseRepresentativeText(values: string[]) {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => {
    const countDelta = b[1] - a[1];
    if (countDelta !== 0) {
      return countDelta;
    }

    return b[0].length - a[0].length;
  })[0][0];
}

function roundTime(value: number) {
  return Math.round(value * 1000) / 1000;
}
