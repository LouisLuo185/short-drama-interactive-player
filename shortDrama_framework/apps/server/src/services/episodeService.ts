import { getDatabase } from "../db/database.js";

export function getEpisodeDetail(episodeId: string) {
  const episode = getDatabase()
    .prepare(
      `SELECT id, drama_id, episode_no, title, video_url, duration_sec
       FROM episodes
       WHERE id = ?`
    )
    .get(episodeId) as
    | {
        id: string;
        drama_id: string;
        episode_no: number;
        title: string;
        video_url: string;
        duration_sec: number;
      }
    | undefined;

  if (!episode) {
    return null;
  }

  return {
    id: episode.id,
    dramaId: episode.drama_id,
    episodeNo: episode.episode_no,
    title: episode.title,
    videoUrl: episode.video_url,
    durationSec: episode.duration_sec
  };
}
