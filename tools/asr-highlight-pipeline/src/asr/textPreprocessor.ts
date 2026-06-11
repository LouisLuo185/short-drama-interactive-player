const SPACE_RE = /\s+/g;
const REPEATED_PUNCTUATION_RE = /([，。！？、,.!?])\1+/g;
const COMMON_NAME_HINT_RE = /[季纪齐七白荣耀太奶奶爷爷妈妈老三二少爷四少爷小少爷]/;

export function cleanAsrText(value: string) {
  return value
    .replace(SPACE_RE, " ")
    .replace(REPEATED_PUNCTUATION_RE, "$1")
    .trim();
}

export function hasNameUncertainty(text: string) {
  // ASR often confuses homophones in names. We flag instead of rewriting.
  return COMMON_NAME_HINT_RE.test(text);
}

export function buildInteractionSafetyNote(nameUncertainty: boolean) {
  if (!nameUncertainty) {
    return "可以引用明确台词，但仍优先使用剧情类型化表达。";
  }

  return "存在专名或同音字不确定，互动文案应避免直接使用具体人名/姓氏/家族名。";
}
