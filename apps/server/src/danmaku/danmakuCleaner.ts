const AD_PATTERNS = [
  /加(?:微|薇|v|V|微信)/,
  /http[s]?:\/\//i,
  /www\./i,
  /点击/,
  /关注.*返/
];

export function cleanDanmakuText(value: string) {
  const text = value
    .normalize("NFKC")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/www\.\S+/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return compressRepeatedText(text)
    .replace(/[!?！？]{3,}/g, "!!")
    .replace(/[.。]{3,}/g, "...")
    .replace(/[,，]{3,}/g, ",")
    .trim();
}

export function isValidDanmakuText(value: string) {
  const text = value.trim();
  if (!text) return false;
  if (AD_PATTERNS.some((pattern) => pattern.test(text))) return false;
  if (/^[\d\s\p{P}\p{S}_]+$/u.test(text)) return false;
  if (text.length === 1 && !/[哈笑爽甜磕哭气刀虐啊]/.test(text)) return false;
  if (text.includes("�")) return false;

  return true;
}

function compressRepeatedText(value: string) {
  return value
    .replace(/(哈哈){2,}/g, "哈哈")
    .replace(/(啊啊){2,}/g, "啊啊")
    .replace(/(卧槽){2,}/g, "卧槽")
    .replace(/(.)\1{4,}/gu, "$1$1");
}
