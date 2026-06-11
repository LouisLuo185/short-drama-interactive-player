import { useState } from "react";
import { usePlayerStore } from "../../stores/playerStore";
import type { InteractionPluginContext, InteractionReportEvent } from "../../types/interaction";
import type { PlayerController } from "../../types/player";

export function usePlayerRuntime(params: {
  episodeId: string | null;
  reportInteractionEvent: (event: InteractionReportEvent) => Promise<void>;
}) {
  const [controller, setController] = useState<PlayerController | null>(null);
  const currentTimeSec = usePlayerStore((state) => state.currentTimeSec);
  const submittedActionEventIds = usePlayerStore((state) => state.submittedActionEventIds);
  const markActionSubmitted = usePlayerStore((state) => state.markActionSubmitted);

  const interactionContext: InteractionPluginContext | null =
    controller && params.episodeId
      ? {
          player: controller,
          episodeId: params.episodeId,
          currentTimeSec,
          hasSubmittedAction: (timelineEventId) =>
            submittedActionEventIds.includes(timelineEventId),
          markActionSubmitted,
          reportInteractionEvent: params.reportInteractionEvent
        }
      : null;

  return {
    controller,
    setController,
    interactionContext
  };
}
