export function computeMarkerTime(params: {
  triggerSentenceEnd: number;
  nextSentenceStart?: number;
  postDelaySec?: number;
}) {
  const postDelaySec = params.postDelaySec ?? 0.3;
  const delayed = params.triggerSentenceEnd + postDelaySec;

  if (Number.isFinite(params.nextSentenceStart)) {
    return Math.max(
      params.triggerSentenceEnd,
      Math.min(delayed, Number(params.nextSentenceStart) - 0.05)
    );
  }

  return delayed;
}
