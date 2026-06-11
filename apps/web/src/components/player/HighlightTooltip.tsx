import type { HighlightMarker } from "../../types/highlightMarker";

type HighlightTooltipProps = {
  marker: HighlightMarker | null;
  leftPercent: number;
};

export function HighlightTooltip(props: HighlightTooltipProps) {
  if (!props.marker) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute bottom-7 z-30 w-52 -translate-x-1/2 rounded-2xl border border-amber-200/20 bg-stone-950/92 px-3 py-2 text-left shadow-2xl shadow-black/45 backdrop-blur"
      style={{
        left: `${Math.max(8, Math.min(92, props.leftPercent))}%`
      }}
    >
      <p className="text-xs font-black text-amber-200">{props.marker.title}</p>
      {props.marker.text ? (
        <p className="mt-1 text-[11px] leading-snug text-amber-50/72">{props.marker.text}</p>
      ) : null}
    </div>
  );
}
