const CHINESE_NUMERAL: Record<string, number> = {
  零: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10
};

export function normalizeDanmakuMatchKey(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[《》「」『』【】[\]()（）{}]/g, "")
    .replace(/[，,。.!！?？:：;；'"“”‘’、\s_-]/g, "")
    .trim();
}

export function isDramaNameMatch(rawDramaName: string, candidates: string[]) {
  const rawKey = normalizeDanmakuMatchKey(rawDramaName);
  return candidates
    .map(normalizeDanmakuMatchKey)
    .filter(Boolean)
    .some((candidateKey) => {
      if (rawKey === candidateKey) return true;
      return rawKey.includes(candidateKey) || candidateKey.includes(rawKey);
    });
}

export function parseEpisodeIndex(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  const text = String(value ?? "").normalize("NFKC").trim();
  const numberMatch = text.match(/\d+/);
  if (numberMatch) return Number(numberMatch[0]);

  const chineseMatch = text.match(/[零一二两三四五六七八九十]+/);
  if (!chineseMatch) return 0;
  return parseChineseEpisodeNumber(chineseMatch[0]);
}

export function episodeIdFromIndex(episodeIndex: number) {
  return `ep_${String(episodeIndex).padStart(3, "0")}`;
}

function parseChineseEpisodeNumber(value: string) {
  if (value === "十") return 10;
  if (value.length === 1) return CHINESE_NUMERAL[value] ?? 0;

  const tenIndex = value.indexOf("十");
  if (tenIndex >= 0) {
    const left = value.slice(0, tenIndex);
    const right = value.slice(tenIndex + 1);
    const tens = left ? CHINESE_NUMERAL[left] ?? 1 : 1;
    const ones = right ? CHINESE_NUMERAL[right] ?? 0 : 0;
    return tens * 10 + ones;
  }

  return CHINESE_NUMERAL[value] ?? 0;
}

