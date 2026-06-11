import type { DanmuItem, ParsedDanmuResult } from "./danmuTypes";

const emptySkippedReasonCounts = {
  missingDramaTitle: 0,
  invalidEpisodeNo: 0,
  invalidTime: 0,
  emptyText: 0,
  outOfDuration: 0
};

const fieldAliases = {
  dramaTitle: ["\u5267\u540d", "\u5267\u540d\u79f0", "\u5287\u540d", "\u5287\u540d\u7a31"],
  groupTitle: ["group_title", "\u5206\u7ec4", "\u5267\u96c6", "\u5287\u96c6"],
  rawTime: [
    "\u53d1\u5f39\u5e55\u65f6\u523b",
    "\u53d1\u5f39\u5e55\u65f6\u523b\u76f8\u5bf9\u4e8e\u89c6\u9891\u8d77\u59cb\u65f6\u95f4\u504f\u79fb\u91cf",
    "\u767c\u5f48\u5e55\u6642\u523b",
    "\u767c\u5f48\u5e55\u6642\u523b\u76f8\u5c0d\u65bc\u8996\u983b\u8d77\u59cb\u6642\u9593\u504f\u79fb\u91cf"
  ],
  likeCount: ["\u7d2f\u8ba1\u70b9\u8d5e\u6570", "\u7d2f\u8a08\u9ede\u8d0a\u6578"],
  text: ["\u5f39\u5e55\u5185\u5bb9", "\u5f48\u5e55\u5167\u5bb9"]
};

export function normalizeDramaTitle(title: string): string {
  return title
    .trim()
    .normalize("NFKC")
    .replace(
      /[\u300a\u300b\u3008\u3009\u300c\u300d\u300e\u300f\u3010\u3011\[\]\uff08\uff09()]/g,
      ""
    )
    .replace(/[\uff0c,\u3002.!！?？:：;；\u3001\u00b7\-_—~～\s]/g, "")
    .replace(/\u5976\u5976/g, "\u5976")
    .toLowerCase();
}

export function isDramaTitleMatch(left: string, right: string): boolean {
  const normalizedLeft = normalizeDramaTitle(left);
  const normalizedRight = normalizeDramaTitle(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  );
}

export function parseEpisodeNoFromGroupTitle(groupTitle: string): number | null {
  const normalized = groupTitle.trim().normalize("NFKC");
  const patterns = [/\u7b2c\s*(\d+)\s*\u96c6/, /EP\s*(\d+)/i, /Episode\s*(\d+)/i];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      return Number(match[1]);
    }
  }

  return null;
}

export function convertDanmuTimeToSec(rawTime: number): number {
  return rawTime / 1000;
}

export function parseDanmuTableRows(
  rows: Record<string, unknown>[],
  options?: {
    durationSec?: number;
  }
): ParsedDanmuResult {
  const skippedReasonCounts = { ...emptySkippedReasonCounts };
  const allItems: DanmuItem[] = [];

  rows.forEach((row, index) => {
    const dramaTitle = readString(row, fieldAliases.dramaTitle);
    if (!dramaTitle) {
      skippedReasonCounts.missingDramaTitle += 1;
      return;
    }

    const groupTitle = readString(row, fieldAliases.groupTitle);
    const episodeNo = parseEpisodeNoFromGroupTitle(groupTitle);
    if (!episodeNo) {
      skippedReasonCounts.invalidEpisodeNo += 1;
      return;
    }

    const rawTime = readNumber(row, fieldAliases.rawTime);
    if (rawTime === null) {
      skippedReasonCounts.invalidTime += 1;
      return;
    }

    const text = readString(row, fieldAliases.text);
    if (!text) {
      skippedReasonCounts.emptyText += 1;
      return;
    }

    const timeSec = convertDanmuTimeToSec(rawTime);
    if (!Number.isFinite(timeSec) || timeSec < 0) {
      skippedReasonCounts.invalidTime += 1;
      return;
    }

    if (options?.durationSec && timeSec > options.durationSec) {
      skippedReasonCounts.outOfDuration += 1;
      return;
    }

    const likeCount = readNumber(row, fieldAliases.likeCount);
    const normalizedDramaTitle = normalizeDramaTitle(dramaTitle);

    allItems.push({
      id: `${normalizedDramaTitle}_${episodeNo}_${index}_${Math.round(timeSec * 1000)}`,
      dramaTitle,
      episodeNo,
      timeSec,
      text,
      likeCount: likeCount ?? undefined
    });
  });

  const invalidCount = Object.values(skippedReasonCounts).reduce((sum, count) => sum + count, 0);

  return {
    allItems: allItems.sort((a, b) => a.timeSec - b.timeSec),
    invalidCount,
    skippedReasonCounts
  };
}

export function filterDanmuForEpisode(
  allItems: DanmuItem[],
  dramaTitle: string,
  episodeNo: number
): DanmuItem[] {
  return allItems
    .filter((item) => isDramaTitleMatch(item.dramaTitle, dramaTitle) && item.episodeNo === episodeNo)
    .sort((a, b) => a.timeSec - b.timeSec);
}

export function parseCsvRows(csvText: string): Record<string, unknown>[] {
  const rows = parseCsv(csvText);
  const [headers, ...records] = rows;

  if (!headers?.length) {
    return [];
  }

  return records
    .filter((record) => record.some((cell) => cell.trim().length > 0))
    .map((record) =>
      Object.fromEntries(headers.map((header, index) => [normalizeHeader(header), record[index] ?? ""]))
    );
}

function normalizeHeader(header: string) {
  return header.replace(/^\uFEFF/, "").trim();
}

function readString(row: Record<string, unknown>, fields: string[]) {
  const value = readAliasedValue(row, fields);
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function readNumber(row: Record<string, unknown>, fields: string[]) {
  const value = readAliasedValue(row, fields);
  const numberValue =
    typeof value === "number" ? value : Number(String(value ?? "").trim().replace(/,/g, ""));

  return Number.isFinite(numberValue) ? numberValue : null;
}

function readAliasedValue(row: Record<string, unknown>, fields: string[]) {
  for (const field of fields) {
    if (field in row) {
      return row[field];
    }
  }

  return undefined;
}

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const nextChar = input[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);
  return rows;
}
