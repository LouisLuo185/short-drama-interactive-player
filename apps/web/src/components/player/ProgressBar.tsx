import { type PointerEvent, useState } from "react";
import { usePlayerStore } from "../../stores/playerStore";
import type { HighlightMarker } from "../../types/highlightMarker";
import type { PlayerController } from "../../types/player";
import { HighlightProgressMarkers } from "./HighlightProgressMarkers";
import { HighlightTooltip } from "./HighlightTooltip";

const NEAR_MARKER_THRESHOLD_SEC = 2;

type ProgressBarProps = {
  controller: PlayerController | null;
  highlightMarkers?: HighlightMarker[];
};

export function ProgressBar(props: ProgressBarProps) {
  const currentTimeSec = usePlayerStore((state) => state.currentTimeSec);
  const durationSec = usePlayerStore((state) => state.durationSec);
  const progress = durationSec > 0 ? currentTimeSec / durationSec : 0;
  const [hoverMarker, setHoverMarker] = useState<HighlightMarker | null>(null);
  const [draggingTimeSec, setDraggingTimeSec] = useState<number | null>(null);
  const markers = props.highlightMarkers ?? [];
  const activeMarker = hoverMarker ?? findNearbyMarker(markers, draggingTimeSec);
  const tooltipLeftPercent =
    activeMarker && durationSec > 0 ? (activeMarker.timeSec / durationSec) * 100 : 50;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span className="w-12 text-right text-xs font-semibold text-amber-50/65">
        {formatTime(currentTimeSec)}
      </span>

      <div className="relative min-w-0 flex-1">
        <HighlightTooltip marker={activeMarker} leftPercent={tooltipLeftPercent} />
        <input
          type="range"
          min={0}
          max={Math.max(durationSec, 0)}
          step={0.1}
          value={Math.min(currentTimeSec, durationSec || currentTimeSec)}
          disabled={!props.controller || durationSec <= 0}
          className="player-range h-2 w-full cursor-pointer appearance-none rounded-full"
          style={{
            background: `linear-gradient(90deg, #f6c453 ${progress * 100}%, rgba(255,255,255,0.16) ${progress * 100}%)`
          }}
          onChange={(event) => {
            const nextTimeSec = Number(event.currentTarget.value);
            setDraggingTimeSec(nextTimeSec);
            props.controller?.seekTo(nextTimeSec);
          }}
          onPointerDown={(event) => {
            setDraggingTimeSec(getPointerTimeSec(event, durationSec));
          }}
          onPointerMove={(event) => {
            if (event.buttons === 1) {
              setDraggingTimeSec(getPointerTimeSec(event, durationSec));
            }
          }}
          onPointerUp={() => {
            window.setTimeout(() => setDraggingTimeSec(null), 500);
          }}
          aria-label="播放进度"
        />
        <HighlightProgressMarkers
          markers={markers}
          durationSec={durationSec}
          onSeek={(timeSec) => props.controller?.seekTo(timeSec)}
          onHoverMarker={setHoverMarker}
        />
      </div>

      <span className="w-12 text-xs font-semibold text-amber-50/65">
        {formatTime(durationSec)}
      </span>
    </div>
  );
}

function findNearbyMarker(markers: HighlightMarker[], timeSec: number | null) {
  if (timeSec === null) return null;

  return (
    markers.find((marker) => Math.abs(marker.timeSec - timeSec) <= NEAR_MARKER_THRESHOLD_SEC) ??
    null
  );
}

function getPointerTimeSec(event: PointerEvent<HTMLInputElement>, durationSec: number) {
  if (durationSec <= 0) return 0;

  const rect = event.currentTarget.getBoundingClientRect();
  const ratio = (event.clientX - rect.left) / rect.width;
  return Math.max(0, Math.min(durationSec, ratio * durationSec));
}

function formatTime(totalSec: number) {
  const safeTotalSec = Number.isFinite(totalSec) ? Math.max(totalSec, 0) : 0;
  const minutes = Math.floor(safeTotalSec / 60);
  const seconds = Math.floor(safeTotalSec % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}
