import { useCallback, useEffect } from "react";
import {
  reportInteractionEvent as postInteractionEvent,
  reportPlaybackEvent as postPlaybackEvent,
  type PlaybackAnalyticsType
} from "./analyticsClient";
import { usePlayerStore } from "../../stores/playerStore";
import type { EpisodeDetail } from "../../types/episode";
import type { InteractionReportEvent } from "../../types/interaction";

export function usePlaybackAnalytics(episode: EpisodeDetail | null) {
  const reportPlaybackEvent = useCallback(
    async (eventType: PlaybackAnalyticsType, currentTimeSec: number) => {
      if (!episode) return;

      try {
        await postPlaybackEvent({
          episodeId: episode.id,
          eventType,
          currentTimeSec,
          clientTs: Date.now()
        });
      } catch (reportError) {
        console.error("Failed to report playback event", reportError);
      }
    },
    [episode]
  );

  const reportInteractionEvent = useCallback(async (event: InteractionReportEvent) => {
    try {
      await postInteractionEvent(event);
    } catch (reportError) {
      console.error("Failed to report interaction event", reportError);
    }
  }, []);

  useEffect(() => {
    if (!episode) return;

    void postPlaybackEvent({
      episodeId: episode.id,
      eventType: "enter_page",
      currentTimeSec: 0,
      clientTs: Date.now()
    }).catch((reportError) => {
      console.error("Failed to report enter_page", reportError);
    });

    return () => {
      const state = usePlayerStore.getState();
      void postPlaybackEvent({
        episodeId: episode.id,
        eventType: "leave_page",
        currentTimeSec: state.currentTimeSec,
        clientTs: Date.now()
      }).catch((reportError) => {
        console.error("Failed to report leave_page", reportError);
      });
    };
  }, [episode]);

  return {
    reportPlaybackEvent,
    reportInteractionEvent
  };
}
