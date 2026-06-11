import { useEffect, useState } from "react";
import { getVideoTopRightAnchor } from "./getVideoContentAnchor";
import { ReactionAnchorButton } from "./ReactionAnchorButton";
import { ReactionFeedbackToast } from "./ReactionFeedbackToast";
import { ReactionWheelOption } from "./ReactionWheelOption";
import { useReactionWheel } from "./useReactionWheel";
import type { ReactionOption, ReactionWheelConfig } from "./reactionWheelTypes";

type ReactionWheelProps = {
  config: ReactionWheelConfig;
  videoElement: HTMLVideoElement | null;
  playerElement: HTMLElement | null;
  disabled?: boolean;
  onSelect: (reaction: ReactionOption) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

export function ReactionWheel(props: ReactionWheelProps) {
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updateAnchor = () => {
      setAnchor(
        getVideoTopRightAnchor({
          videoElement: props.videoElement,
          playerElement: props.playerElement,
          anchor: props.config.placement.anchor,
          offsetX: props.config.placement.offsetX,
          offsetY: props.config.placement.offsetY
        })
      );
    };

    updateAnchor();
    window.addEventListener("resize", updateAnchor);
    window.addEventListener("orientationchange", updateAnchor);

    return () => {
      window.removeEventListener("resize", updateAnchor);
      window.removeEventListener("orientationchange", updateAnchor);
    };
  }, [props.config.placement.offsetX, props.config.placement.offsetY, props.playerElement, props.videoElement]);

  const wheel = useReactionWheel({
    config: props.config,
    anchor,
    onSelect: props.onSelect,
    onOpen: props.onOpen,
    onClose: props.onClose
  });

  if (props.disabled) return null;

  return (
    <div
      className={[
        "pointer-events-none absolute z-30 transition-opacity duration-300",
        wheel.state === "cooldown" ? "opacity-0" : "opacity-100"
      ].join(" ")}
      style={{
        left: anchor.x,
        top: anchor.y,
        transform: "translate(-50%, -50%)"
      }}
    >
      <div className="pointer-events-auto relative" data-reaction-wheel-root>
        {wheel.options.map((option, index) => (
          <ReactionWheelOption
            key={option.id}
            option={option}
            position={wheel.positions[index]}
            expanded={wheel.isExpanded}
            selected={wheel.hoveredIndex === index}
            index={index}
            sizePx={props.config.wheel.optionSizePx}
            onSelect={wheel.handleOptionClick}
          />
        ))}
        <ReactionAnchorButton
          option={props.config.defaultReaction}
          state={wheel.state}
          pressProgress={wheel.pressProgress}
          onPointerDown={wheel.handlePointerDown}
          onPointerMove={wheel.handlePointerMove}
          onPointerUp={wheel.handlePointerUp}
          onPointerCancel={wheel.handlePointerCancel}
        />
        <ReactionFeedbackToast
          option={wheel.selectedOption}
          config={props.config}
          onComplete={wheel.handleFeedbackComplete}
        />
      </div>
    </div>
  );
}
