import type { HighlightMarker } from "../../types/highlightMarker";

const SEEK_LEAD_SEC = 1.5;

type HighlightProgressMarkersProps = {
  markers: HighlightMarker[];
  durationSec: number;
  onSeek: (timeSec: number) => void;
  onHoverMarker?: (marker: HighlightMarker | null) => void;
};

export function HighlightProgressMarkers(props: HighlightProgressMarkersProps) {
  if (props.durationSec <= 0 || props.markers.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-1/2 z-20 h-4 -translate-y-1/2">
      {props.markers.map((marker) => {
        const leftPercent = clampPercent((marker.timeSec / props.durationSec) * 100);

        return (
          <button
            key={marker.id}
            type="button"
            className="pointer-events-auto absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80 shadow-[0_0_0_3px_rgba(0,0,0,0.32)] transition hover:scale-150 focus:outline-none focus:ring-2 focus:ring-amber-100"
            style={{
              left: `${leftPercent}%`,
              backgroundColor: marker.color ?? "#facc15"
            }}
            aria-label={marker.title}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              props.onSeek(Math.max(0, marker.timeSec - SEEK_LEAD_SEC));
            }}
            onMouseEnter={() => props.onHoverMarker?.(marker)}
            onMouseLeave={() => props.onHoverMarker?.(null)}
            onFocus={() => props.onHoverMarker?.(marker)}
            onBlur={() => props.onHoverMarker?.(null)}
          />
        );
      })}
    </div>
  );
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}
