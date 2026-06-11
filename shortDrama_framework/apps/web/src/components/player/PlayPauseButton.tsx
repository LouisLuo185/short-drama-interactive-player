import { usePlayerStore } from "../../stores/playerStore";
import type { PlayerController } from "../../types/player";
import { PlayerIcon } from "./PlayerIcon";

type PlayPauseButtonProps = {
  controller: PlayerController | null;
};

export function PlayPauseButton(props: PlayPauseButtonProps) {
  const status = usePlayerStore((state) => state.status);
  const isPlaying = status === "playing";

  return (
    <button
      type="button"
      className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-amber-300 text-stone-950 shadow-lg shadow-amber-950/25 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-45"
      disabled={!props.controller || status === "loading" || status === "error"}
      onClick={() => {
        if (!props.controller) return;

        if (isPlaying) {
          props.controller.pause();
          return;
        }

        void props.controller.play();
      }}
      aria-label={isPlaying ? "Pause" : "Play"}
      title={isPlaying ? "Pause" : "Play"}
    >
      <PlayerIcon name={isPlaying ? "pause" : "play"} className="h-5 w-5" />
    </button>
  );
}
