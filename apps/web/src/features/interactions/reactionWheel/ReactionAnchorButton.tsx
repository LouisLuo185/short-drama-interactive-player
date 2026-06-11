import type { PointerEventHandler } from "react";
import type { ReactionOption, ReactionWheelState } from "./reactionWheelTypes";

type ReactionAnchorButtonProps = {
  option: ReactionOption;
  state: ReactionWheelState;
  pressProgress: number;
  onPointerDown: PointerEventHandler<HTMLButtonElement>;
  onPointerMove: PointerEventHandler<HTMLButtonElement>;
  onPointerUp: PointerEventHandler<HTMLButtonElement>;
  onPointerCancel: PointerEventHandler<HTMLButtonElement>;
};

export function ReactionAnchorButton(props: ReactionAnchorButtonProps) {
  const progressDeg = Math.round(props.pressProgress * 360);
  const isPressing = props.state === "pressing";

  return (
    <button
      type="button"
      className={[
        "relative grid h-12 w-12 touch-none select-none place-items-center rounded-full border text-2xl shadow-2xl shadow-black/50 backdrop-blur-md transition duration-200",
        "border-white/20 bg-black/45 text-white hover:scale-105 hover:border-amber-200/60",
        props.state === "expanded" || props.state === "selecting" ? "scale-105 border-amber-200/75" : "",
        props.state === "cooldown" ? "opacity-70" : ""
      ].join(" ")}
      style={
        isPressing
          ? {
              background: `conic-gradient(rgba(255, 210, 64, 0.95) ${progressDeg}deg, rgba(0,0,0,0.45) 0deg)`
            }
          : undefined
      }
      aria-label={`发送剧情反应：${props.option.label}`}
      title={`短按发送「${props.option.label}」，长按展开更多反应`}
      onPointerDown={props.onPointerDown}
      onPointerMove={props.onPointerMove}
      onPointerUp={props.onPointerUp}
      onPointerCancel={props.onPointerCancel}
    >
      <span className="grid h-10 w-10 place-items-center rounded-full bg-black/55 leading-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.7)]">
        {props.option.staticEmoji ?? "✨"}
      </span>
    </button>
  );
}
