import { useEffect } from "react";
import type { ReactionOption, ReactionWheelConfig } from "./reactionWheelTypes";

type ReactionFeedbackToastProps = {
  option: ReactionOption | null;
  config: ReactionWheelConfig;
  onComplete: () => void;
};

export function ReactionFeedbackToast(props: ReactionFeedbackToastProps) {
  const optionId = props.option?.id;
  const durationMs = props.config.feedback.durationMs;
  const enabled = props.config.feedback.enabled;
  const onComplete = props.onComplete;

  useEffect(() => {
    if (!optionId || !enabled) return;

    const timer = window.setTimeout(() => {
      onComplete();
    }, durationMs);

    return () => window.clearTimeout(timer);
  }, [durationMs, enabled, onComplete, optionId]);

  if (!props.option || !props.config.feedback.enabled) return null;

  const text = props.config.feedback.template
    .replace("{percent}", String(props.option.percent ?? 68))
    .replace("{label}", props.option.label);

  return (
    <div className="absolute left-1/2 top-14 w-max max-w-[160px] -translate-x-1/2 animate-[reactionFeedback_1.8s_ease-out_forwards] rounded-full bg-black/55 px-2.5 py-1 text-center text-[11px] font-semibold leading-tight text-white shadow-xl shadow-black/40 backdrop-blur-md">
      {text}
    </div>
  );
}
