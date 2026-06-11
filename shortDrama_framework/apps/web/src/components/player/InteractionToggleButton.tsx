import { PlayerIcon } from "./PlayerIcon";

type InteractionToggleButtonProps = {
  enabled: boolean;
  onToggle: () => void;
};

export function InteractionToggleButton(props: InteractionToggleButtonProps) {
  return (
    <button
      type="button"
      className={[
        "grid h-10 w-10 shrink-0 place-items-center rounded-full border transition",
        props.enabled
          ? "border-amber-200/25 bg-amber-300 text-stone-950 hover:bg-amber-200"
          : "border-amber-200/20 bg-amber-50/[0.06] text-amber-100/60 hover:bg-amber-50/14"
      ].join(" ")}
      onClick={props.onToggle}
      aria-pressed={props.enabled}
      aria-label={props.enabled ? "Hide highlights and interactions" : "Show highlights and interactions"}
      title={props.enabled ? "Hide highlights and interactions" : "Show highlights and interactions"}
    >
      <PlayerIcon name={props.enabled ? "sparkles" : "sparkles-off"} className="h-5 w-5" />
    </button>
  );
}
