import { useEffect, useState } from "react";
import { fetchDramaDetail } from "../../services/dramaApi";
import { fetchEpisodeDetail } from "../../services/episodeApi";
import { fetchEpisodeHighlights } from "../../services/highlightApi";
import { usePlayerStore } from "../../stores/playerStore";
import type { DramaDetail } from "../../types/drama";
import type { EpisodeDetail } from "../../types/episode";
import type { TimelineEvent } from "../../types/timeline";

export type WatchEpisodeState = {
  drama: DramaDetail | null;
  episode: EpisodeDetail | null;
  timelineEvents: TimelineEvent[];
  isLoading: boolean;
  error: string | null;
};

export function useWatchEpisode(episodeId: string | undefined) {
  const [state, setState] = useState<WatchEpisodeState>({
    drama: null,
    episode: null,
    timelineEvents: [],
    isLoading: true,
    error: null
  });
  const setPlayerEpisode = usePlayerStore((store) => store.setEpisode);
  const setTimelineEvents = usePlayerStore((store) => store.setTimelineEvents);
  const setTriggeredEventIds = usePlayerStore((store) => store.setTriggeredEventIds);
  const resetPlayerState = usePlayerStore((store) => store.resetPlayerState);

  useEffect(() => {
    let ignore = false;

    async function loadEpisode() {
      if (!episodeId) {
        setState({
          drama: null,
          episode: null,
          timelineEvents: [],
          isLoading: false,
          error: "缺少 episodeId"
        });
        return;
      }

      try {
        setState((current) => ({ ...current, isLoading: true, error: null }));
        resetPlayerState();

        const episodeData = await fetchEpisodeDetail(episodeId);
        const [dramaData, highlightEvents] = await Promise.all([
          fetchDramaDetail(episodeData.dramaId),
          fetchEpisodeHighlights(episodeId)
        ]);

        if (ignore) return;

        const timelineEvents = highlightEvents;

        setPlayerEpisode(episodeData.id, episodeData.videoUrl);
        setTimelineEvents(timelineEvents);
        setTriggeredEventIds([]);
        setState({
          drama: dramaData,
          episode: episodeData,
          timelineEvents,
          isLoading: false,
          error: null
        });
      } catch (loadError) {
        if (!ignore) {
          setState({
            drama: null,
            episode: null,
            timelineEvents: [],
            isLoading: false,
            error: loadError instanceof Error ? loadError.message : "剧集加载失败"
          });
        }
      }
    }

    void loadEpisode();

    return () => {
      ignore = true;
      resetPlayerState();
    };
  }, [episodeId, resetPlayerState, setPlayerEpisode, setTimelineEvents, setTriggeredEventIds]);

  return state;
}
