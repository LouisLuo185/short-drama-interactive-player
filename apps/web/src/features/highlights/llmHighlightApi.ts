import { getJson } from "../../services/http";
import type { HighlightMarker } from "../../types/highlightMarker";

type EpisodeLlmHighlightsResponse = {
  episodeId: string;
  markers: HighlightMarker[];
};

export async function fetchEpisodeLlmHighlights(episodeId: string) {
  const data = await getJson<EpisodeLlmHighlightsResponse>(
    `/api/episodes/${episodeId}/llm-highlights`
  );

  return data.markers ?? [];
}
