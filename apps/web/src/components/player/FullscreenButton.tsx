import { PlayerIcon } from "./PlayerIcon";

type FullscreenButtonProps = {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
};

export function FullscreenButton(props: FullscreenButtonProps) {
  return (
    <button
      type="button"
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-amber-200/20 bg-amber-50/[0.06] text-amber-100 transition hover:bg-amber-50/14 hover:text-amber-50"
      onClick={props.onToggleFullscreen}
      aria-label={props.isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      title={props.isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
    >
      <PlayerIcon name={props.isFullscreen ? "minimize" : "maximize"} className="h-5 w-5" />
    </button>
  );
}
