import { PlayerIcon } from "./PlayerIcon";

type EpisodeSwitchButtonProps = {
  direction: "prev" | "next";
  onClick: () => void;
};

export function EpisodeSwitchButton(props: EpisodeSwitchButtonProps) {
  const isPrev = props.direction === "prev";

  return (
    <button
      type="button"
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-amber-200/20 bg-amber-50/[0.06] text-amber-100 transition hover:bg-amber-50/14 hover:text-amber-50"
      onClick={props.onClick}
      aria-label={isPrev ? "Previous episode" : "Next episode"}
      title={isPrev ? "Previous episode" : "Next episode"}
    >
      <PlayerIcon name={isPrev ? "chevron-left" : "chevron-right"} className="h-5 w-5" />
    </button>
  );
}
