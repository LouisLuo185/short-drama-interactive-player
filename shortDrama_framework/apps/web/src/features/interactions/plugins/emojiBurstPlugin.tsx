import { useState } from "react";
import type { InteractionPlugin, InteractionPluginContext } from "../../../types/interaction";
import type { TimelineEvent } from "../../../types/timeline";

type EmojiPayload = {
  emojis?: string[];
  text?: string;
};

export const emojiBurstPlugin: InteractionPlugin = {
  type: "emoji_burst",
  render: (timelineEvent, context) => (
    <EmojiBurstInteraction timelineEvent={timelineEvent} context={context} />
  )
};

function EmojiBurstInteraction(props: {
  timelineEvent: TimelineEvent;
  context: InteractionPluginContext;
}) {
  const payload = props.timelineEvent.interactionPayload as EmojiPayload | undefined;
  const emojis = payload?.emojis?.length ? payload.emojis : ["心动", "震惊", "想哭"];
  const [bursts, setBursts] = useState<Array<{ id: number; emoji: string }>>([]);

  async function handleClick(emoji: string) {
    const burstId = Date.now();
    setBursts((current) => [...current.slice(-5), { id: burstId, emoji }]);

    await props.context.reportInteractionEvent({
      episodeId: props.context.episodeId,
      highlightId: props.timelineEvent.source === "highlight_api" ? props.timelineEvent.id : undefined,
      timelineEventId: props.timelineEvent.id,
      interactionType: props.timelineEvent.interactionType,
      action: "click",
      payload: { emoji },
      currentTimeSec: props.context.currentTimeSec,
      clientTs: Date.now()
    });
  }

  return (
    <div className="absolute inset-x-4 bottom-5 flex justify-center">
      <div className="relative rounded-[1.5rem] border border-amber-200/20 bg-black/72 p-4 text-amber-50 shadow-2xl shadow-black/45 backdrop-blur">
        <p className="text-sm font-semibold text-amber-100">{payload?.text ?? props.timelineEvent.title}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="rounded-full bg-amber-50/12 px-4 py-2 text-sm font-bold transition hover:-translate-y-0.5 hover:bg-amber-300 hover:text-stone-950"
              onClick={() => void handleClick(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.5rem]">
          {bursts.map((burst, index) => (
            <span
              key={burst.id}
              className="absolute bottom-10 animate-[floatUp_1.2s_ease-out_forwards] text-xl font-black"
              style={{ left: `${22 + index * 12}%` }}
            >
              {burst.emoji}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
