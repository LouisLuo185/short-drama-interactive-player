import type { DanmuItem } from "./danmuTypes";
import { DANMU_DURATION_SEC } from "./danmuRuntime";
import { useDanmuRuntime } from "./useDanmuRuntime";

type DanmuOverlayProps = {
  currentTimeSec: number;
  danmuItems: DanmuItem[];
  enabled: boolean;
  isPlaying: boolean;
};

export function DanmuOverlay(props: DanmuOverlayProps) {
  const { flyingDanmu, removeFlyingDanmu } = useDanmuRuntime({
    currentTimeSec: props.currentTimeSec,
    danmuItems: props.danmuItems,
    enabled: props.enabled,
    isPlaying: props.isPlaying
  });

  if (!props.enabled || props.danmuItems.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {import.meta.env.DEV && flyingDanmu.length === 0 ? (
        <span className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-xs text-amber-100/80">
          danmu ready: {props.danmuItems.length}, t={props.currentTimeSec.toFixed(1)}
        </span>
      ) : null}

      {flyingDanmu.map(({ flightId, item, trackIndex }) => (
        <span
          key={flightId}
          className="danmu-fly absolute rounded-full bg-black/24 px-3 py-1 text-sm font-bold text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]"
          style={{
            top: `${8 + trackIndex * 8}%`,
            color: item.color,
            whiteSpace: "nowrap",
            animationDuration: `${DANMU_DURATION_SEC}s`,
            animationPlayState: props.isPlaying ? "running" : "paused"
          }}
          onAnimationEnd={() => removeFlyingDanmu(flightId)}
        >
          {item.text}
        </span>
      ))}
    </div>
  );
}
