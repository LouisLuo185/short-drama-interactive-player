import type { ChangeEvent } from "react";
import type { DramaDetail } from "../../types/drama";
import type { EpisodeDetail } from "../../types/episode";
import { filterDanmuForEpisode, parseCsvRows, parseDanmuTableRows } from "./danmuParser";
import { useDanmuStore } from "./useDanmuStore";

const labels = {
  csvOnly: "\u5f53\u524d MVP \u4ec5\u652f\u6301 CSV\u3002\u8bf7\u5148\u5c06 Excel \u5f39\u5e55\u8868\u53e6\u5b58\u4e3a CSV \u540e\u5bfc\u5165\u3002",
  episodeNotReady: "\u5f53\u524d\u5267\u96c6\u4fe1\u606f\u5c1a\u672a\u52a0\u8f7d\u5b8c\u6210\u3002",
  importButton: "\u5bfc\u5165\u5f39\u5e55 CSV",
  closeDanmu: "\u5173\u95ed\u5f39\u5e55",
  openDanmu: "\u5f00\u542f\u5f39\u5e55",
  clearCurrent: "\u6e05\u7a7a\u5f53\u524d\u96c6\u5f39\u5e55",
  currentEpisode: "\u5f53\u524d\u96c6",
  pieces: "\u6761",
  parseFailed: "\u5f39\u5e55\u6587\u4ef6\u89e3\u6790\u5931\u8d25",
  unknownError: "\u672a\u77e5\u9519\u8bef",
  hint: "\u5f53\u524d MVP \u4ec5\u652f\u6301 CSV\u3002\u4f1a\u81ea\u52a8\u8bc6\u522b UTF-8 / GB18030\uff0c\u5e76\u505a\u5267\u540d\u5bbd\u677e\u5339\u914d\u3002"
};

type DanmuImportPanelProps = {
  drama: DramaDetail | null;
  episode: EpisodeDetail | null;
};

export function DanmuImportPanel(props: DanmuImportPanelProps) {
  const importStatus = useDanmuStore((state) => state.importStatus);
  const importMessage = useDanmuStore((state) => state.importMessage);
  const currentEpisodeDanmuItems = useDanmuStore((state) => state.currentEpisodeDanmuItems);
  const isDanmuVisible = useDanmuStore((state) => state.isDanmuVisible);
  const setAllDanmuItems = useDanmuStore((state) => state.setAllDanmuItems);
  const setCurrentEpisodeDanmuItems = useDanmuStore(
    (state) => state.setCurrentEpisodeDanmuItems
  );
  const clearCurrentEpisodeDanmuItems = useDanmuStore(
    (state) => state.clearCurrentEpisodeDanmuItems
  );
  const setImportResult = useDanmuStore((state) => state.setImportResult);
  const setDanmuVisible = useDanmuStore((state) => state.setDanmuVisible);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setImportResult("error", labels.csvOnly);
      return;
    }

    if (!props.drama || !props.episode) {
      setImportResult("error", labels.episodeNotReady);
      return;
    }

    try {
      const { text: csvText, encoding } = await readDanmuCsvText(file);
      const rows = parseCsvRows(csvText);
      const parsed = parseDanmuTableRows(rows);
      const allMatchedForEpisode = filterDanmuForEpisode(
        parsed.allItems,
        props.drama.title,
        props.episode.episodeNo
      );
      const matchedItems = allMatchedForEpisode.filter(
        (item) => item.timeSec <= props.episode!.durationSec
      );
      const outOfDurationCount = allMatchedForEpisode.length - matchedItems.length;
      const invalidCount = parsed.invalidCount + outOfDurationCount;

      setAllDanmuItems(parsed.allItems);
      setCurrentEpisodeDanmuItems(matchedItems);

      if (matchedItems.length === 0) {
        setImportResult(
          "success",
          `弹幕总表导入成功（${encoding}），但当前短剧《${props.drama.title}》第 ${props.episode.episodeNo} 集没有匹配弹幕。总有效 ${parsed.allItems.length} 条，跳过无效弹幕 ${invalidCount} 条。`
        );
      } else {
        setImportResult(
          "success",
          `已导入总弹幕 ${parsed.allItems.length} 条（${encoding}），当前集匹配 ${matchedItems.length} 条，跳过无效弹幕 ${invalidCount} 条。`
        );
      }
    } catch (error) {
      setImportResult(
        "error",
        `${labels.parseFailed}：${error instanceof Error ? error.message : labels.unknownError}`
      );
    }
  }

  return (
    <section className="mt-5 rounded-[1.5rem] border border-amber-200/10 bg-amber-50/[0.05] p-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-full bg-amber-300 px-4 py-2 text-sm font-black text-stone-950 transition hover:bg-amber-200">
          {labels.importButton}
          <input className="hidden" type="file" accept=".csv" onChange={handleFileChange} />
        </label>
        <button
          type="button"
          className="rounded-full border border-amber-200/20 px-4 py-2 text-sm font-bold text-amber-100 transition hover:bg-amber-50/10"
          onClick={() => setDanmuVisible(!isDanmuVisible)}
        >
          {isDanmuVisible ? labels.closeDanmu : labels.openDanmu}
        </button>
        <button
          type="button"
          className="rounded-full border border-amber-200/20 px-4 py-2 text-sm font-bold text-amber-100 transition hover:bg-amber-50/10"
          onClick={clearCurrentEpisodeDanmuItems}
        >
          {labels.clearCurrent}
        </button>
        <span className="text-sm text-amber-50/60">
          {labels.currentEpisode} {currentEpisodeDanmuItems.length} {labels.pieces}
        </span>
      </div>
      {importMessage ? (
        <p
          className={
            "mt-3 text-sm " +
            (importStatus === "error" ? "text-red-100" : "text-emerald-100")
          }
        >
          {importMessage}
        </p>
      ) : (
        <p className="mt-3 text-sm text-amber-50/50">{labels.hint}</p>
      )}
    </section>
  );
}

async function readDanmuCsvText(file: File) {
  const buffer = await file.arrayBuffer();
  const utf8Text = new TextDecoder("utf-8").decode(buffer);

  if (looksLikeDanmuCsv(utf8Text)) {
    return { text: utf8Text, encoding: "UTF-8" };
  }

  try {
    const gb18030Text = new TextDecoder("gb18030").decode(buffer);
    if (looksLikeDanmuCsv(gb18030Text)) {
      return { text: gb18030Text, encoding: "GB18030" };
    }
  } catch {
    // Some browsers may not expose gb18030. In that case keep the UTF-8 result.
  }

  return { text: utf8Text, encoding: "UTF-8 fallback" };
}

function looksLikeDanmuCsv(text: string) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  return (
    firstLine.includes("\u5267\u540d") ||
    firstLine.includes("\u5267\u540d\u79f0") ||
    firstLine.includes("\u53d1\u5f39\u5e55") ||
    firstLine.includes("\u5f39\u5e55\u5185\u5bb9")
  );
}
