import { getJson } from "./http";
import type { TimelineEvent } from "../types/timeline";

export function fetchEpisodeHighlights(episodeId: string) {
  return getJson<TimelineEvent[]>(`/api/episodes/${episodeId}/highlights`);
}
