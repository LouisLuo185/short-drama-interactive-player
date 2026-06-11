import { useState } from "react";
import type { InteractionPlugin, InteractionPluginContext } from "../../../types/interaction";
import type { TimelineEvent } from "../../../types/timeline";

type VotePayload = {
  question?: string;
  options?: string[];
};

export const reactionVotePlugin: InteractionPlugin = {
  type: "reaction_vote",
  render: (timelineEvent, context) => (
    <ReactionVoteInteraction timelineEvent={timelineEvent} context={context} />
  )
};

function ReactionVoteInteraction(props: {
  timelineEvent: TimelineEvent;
  context: InteractionPluginContext;
}) {
  const payload = props.timelineEvent.interactionPayload as VotePayload | undefined;
  const options = payload?.options?.length ? payload.options : ["支持", "反对", "再看看"];
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const alreadySubmitted = props.context.hasSubmittedAction(props.timelineEvent.id);
  const isLocked = props.timelineEvent.actionOnce && alreadySubmitted;

  async function handleVote(option: string) {
    if (isLocked) return;

    setSelectedOption(option);
    await props.context.reportInteractionEvent({
      episodeId: props.context.episodeId,
      highlightId: props.timelineEvent.source === "highlight_api" ? props.timelineEvent.id : undefined,
      timelineEventId: props.timelineEvent.id,
      interactionType: props.timelineEvent.interactionType,
      action: "vote",
      payload: { option },
      currentTimeSec: props.context.currentTimeSec,
      clientTs: Date.now()
    });

    if (props.timelineEvent.actionOnce) {
      props.context.markActionSubmitted(props.timelineEvent.id);
    }
  }

  return (
    <div className="absolute right-4 top-4 w-[min(360px,calc(100%-2rem))] rounded-[1.5rem] border border-amber-200/20 bg-black/76 p-4 text-amber-50 shadow-2xl shadow-black/45 backdrop-blur">
      <p className="text-xs uppercase tracking-[0.24em] text-amber-200/65">Reaction Vote</p>
      <h2 className="mt-2 text-xl font-black">{payload?.question ?? props.timelineEvent.title}</h2>
      <div className="mt-4 grid gap-2">
        {options.map((option) => {
          const isSelected = selectedOption === option || (isLocked && selectedOption === option);

          return (
            <button
              key={option}
              type="button"
              disabled={isLocked}
              className={
                "rounded-2xl border px-4 py-3 text-left text-sm font-bold transition disabled:cursor-not-allowed " +
                (isSelected
                  ? "border-amber-300 bg-amber-300 text-stone-950"
                  : "border-amber-200/15 bg-amber-50/8 hover:border-amber-200/45 hover:bg-amber-50/14")
              }
              onClick={() => void handleVote(option)}
            >
              {option}
            </button>
          );
        })}
      </div>
      {isLocked ? <p className="mt-3 text-xs text-amber-100/65">你已提交，本事件只能互动一次。</p> : null}
    </div>
  );
}
