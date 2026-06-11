import { getJson } from "./http";
import type { EpisodeDetail } from "../types/episode";

export function fetchEpisodeDetail(episodeId: string) {
  return getJson<EpisodeDetail>(`/api/episodes/${episodeId}`);
}
