import { useCallback, useEffect, useState } from "react";
import type { HighlightMarker } from "../../types/highlightMarker";
import { fetchEpisodeLlmHighlights } from "./llmHighlightApi";

export function useEpisodeHighlightMarkers(episodeId?: string) {
  const [markers, setMarkers] = useState<HighlightMarker[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadMarkers() {
      if (!episodeId) {
        setMarkers([]);
        return;
      }

      try {
        const nextMarkers = await fetchEpisodeLlmHighlights(episodeId);
        if (!ignore) {
          setMarkers(nextMarkers);
        }
      } catch (error) {
        if (!ignore) {
          setMarkers([]);
          if (import.meta.env.DEV) {
            console.warn("Failed to fetch LLM highlight markers", error);
          }
        }
      }
    }

    void loadMarkers();

    return () => {
      ignore = true;
    };
  }, [episodeId, reloadKey]);

  return {
    markers,
    refresh
  };
}
