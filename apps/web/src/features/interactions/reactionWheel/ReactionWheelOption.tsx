import type { ArcPosition } from "./reactionWheelMath";
import type { ReactionOption } from "./reactionWheelTypes";

type ReactionWheelOptionProps = {
  option: ReactionOption;
  position: ArcPosition;
  expanded: boolean;
  selected: boolean;
  index: number;
  sizePx: number;
  onSelect: (option: ReactionOption) => void;
};

export function ReactionWheelOption(props: ReactionWheelOptionProps) {
  return (
    <button
      type="button"
      className={[
        "absolute left-0 top-0 grid touch-none select-none place-items-center rounded-full border text-2xl shadow-xl shadow-black/45 backdrop-blur-md",
        "border-white/20 bg-black/55 text-white transition-[transform,opacity,border-color,background-color] duration-200 ease-out",
        props.expanded ? "opacity-100" : "pointer-events-none opacity-0",
        props.selected ? "border-amber-200 bg-amber-300/25" : "hover:border-amber-200/70 hover:bg-black/70"
      ].join(" ")}
      style={{
        width: props.sizePx,
        height: props.sizePx,
        transform: props.expanded
          ? `translate(${props.position.x}px, ${props.position.y}px) scale(1)`
          : "translate(0, 0) scale(0.72)",
        transitionDelay: props.expanded ? `${props.index * 35}ms` : "0ms"
      }}
      aria-label={`选择反应：${props.option.label}`}
      title={props.option.label}
      onClick={(event) => {
        event.stopPropagation();
        props.onSelect(props.option);
      }}
    >
      <span className="leading-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.75)]">
        {props.option.staticEmoji ?? "✨"}
      </span>
    </button>
  );
}
