export function cleanOcrText(value: string) {
  return value
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .replace(/([\p{Script=Han}])\s+([\p{Script=Han}])/gu, "$1$2")
    .trim();
}

export function isUsefulText(
  value: string,
  options: {
    minTextLength: number;
    maxTextLength: number;
    minHanChars: number;
    minOcrConfidence: number;
    confidence: number | null;
  }
) {
  const compact = value.replace(/\s/g, "");
  const hanChars = compact.match(/\p{Script=Han}/gu)?.length ?? 0;
  const latinChars = compact.match(/[A-Za-z]/g)?.length ?? 0;
  const digitChars = compact.match(/\d/g)?.length ?? 0;
  const symbolChars = [...compact].length - hanChars - latinChars - digitChars;

  if (options.confidence !== null && options.confidence < options.minOcrConfidence) {
    return false;
  }

  if (compact.length < options.minTextLength || compact.length > options.maxTextLength) {
    return false;
  }

  if (hanChars < options.minHanChars) {
    return false;
  }

  if (symbolChars > Math.max(4, compact.length * 0.35)) {
    return false;
  }

  return /[\p{L}\p{N}]/u.test(compact);
}

export function similarity(a: string, b: string) {
  if (a === b) {
    return 1;
  }

  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) {
    return 1;
  }

  return 1 - levenshteinDistance(a, b) / maxLength;
}

function levenshteinDistance(a: string, b: string) {
  const left = [...a];
  const right = [...b];
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = new Array<number>(right.length + 1);

  for (let i = 1; i <= left.length; i += 1) {
    current[0] = i;

    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost
      );
    }

    for (let j = 0; j <= right.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[right.length];
}
