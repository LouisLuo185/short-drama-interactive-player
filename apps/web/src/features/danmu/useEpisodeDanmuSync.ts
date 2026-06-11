import { useEffect } from "react";
import type { DramaDetail } from "../../types/drama";
import type { EpisodeDetail } from "../../types/episode";
import { filterDanmuForEpisode } from "./danmuParser";
import { useDanmuStore } from "./useDanmuStore";

export function useEpisodeDanmuSync(params: {
  drama: DramaDetail | null;
  episode: EpisodeDetail | null;
}) {
  const allDanmuItems = useDanmuStore((state) => state.allDanmuItems);
  const setCurrentEpisodeDanmuItems = useDanmuStore(
    (state) => state.setCurrentEpisodeDanmuItems
  );
  const clearCurrentEpisodeDanmuItems = useDanmuStore(
    (state) => state.clearCurrentEpisodeDanmuItems
  );

  useEffect(() => {
    if (!params.drama || !params.episode) {
      clearCurrentEpisodeDanmuItems();
      return;
    }

    if (allDanmuItems.length === 0) {
      clearCurrentEpisodeDanmuItems();
      return;
    }

    const episode = params.episode;
    setCurrentEpisodeDanmuItems(
      filterDanmuForEpisode(allDanmuItems, params.drama.title, episode.episodeNo).filter(
        (item) => item.timeSec <= episode.durationSec
      )
    );
  }, [
    allDanmuItems,
    clearCurrentEpisodeDanmuItems,
    params.drama,
    params.episode,
    setCurrentEpisodeDanmuItems
  ]);
}
