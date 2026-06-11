import type { RefinedSentence } from "./types.js";

export function writeRefinedSrt(sentences: RefinedSentence[]) {
  return sentences
    .map(
      (sentence, index) =>
        `${index + 1}\n${formatSrtTime(sentence.start)} --> ${formatSrtTime(sentence.end)}\n${sentence.text}\n`
    )
    .join("\n");
}

function formatSrtTime(seconds: number) {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const ms = totalMs % 1000;
  const totalSeconds = Math.floor(totalMs / 1000);
  const sec = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const min = totalMinutes % 60;
  const hour = Math.floor(totalMinutes / 60);

  return `${pad(hour)}:${pad(min)}:${pad(sec)},${String(ms).padStart(3, "0")}`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
