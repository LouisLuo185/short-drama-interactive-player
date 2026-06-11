import { useEffect, useState } from "react";
import type { PlayerController } from "../../types/player";
import { PlayerIcon } from "./PlayerIcon";

type VolumeControlProps = {
  controller: PlayerController | null;
};

export function VolumeControl(props: VolumeControlProps) {
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const snapshot = props.controller?.getSnapshot();
    if (!snapshot) return;

    setVolume(snapshot.volume);
    setMuted(snapshot.muted);
  }, [props.controller]);

  const effectiveVolume = muted ? 0 : volume;
  const isSilent = muted || volume === 0;

  return (
    <div className="flex shrink-0 items-center gap-2 rounded-full border border-amber-200/15 bg-amber-50/[0.04] px-2.5 py-2">
      <button
        type="button"
        className="grid h-6 w-6 place-items-center text-amber-100 transition hover:text-amber-200 disabled:opacity-45"
        disabled={!props.controller}
        onClick={() => {
          const nextMuted = !muted;
          setMuted(nextMuted);
          props.controller?.setMuted(nextMuted);
        }}
        aria-label={isSilent ? "Unmute" : "Mute"}
        title={isSilent ? "Unmute" : "Mute"}
      >
        <PlayerIcon name={isSilent ? "muted" : "volume"} className="h-4 w-4" />
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={effectiveVolume}
        disabled={!props.controller}
        className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-amber-50/20 accent-amber-300 disabled:cursor-not-allowed disabled:opacity-45"
        onChange={(event) => {
          const nextVolume = Number(event.currentTarget.value);
          setVolume(nextVolume);
          setMuted(nextVolume === 0);
          props.controller?.setVolume(nextVolume);
          props.controller?.setMuted(nextVolume === 0);
        }}
        aria-label="Volume"
      />
    </div>
  );
}
