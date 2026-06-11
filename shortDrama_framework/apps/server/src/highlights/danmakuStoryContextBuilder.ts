import { loadDanmakuStorySummary } from "../danmaku/danmakuSignalService.js";

export async function buildDanmakuStoryContextForEpisode(params: {
  dataRoot: string;
  dramaSlug: string;
  episodeId: string;
}) {
  const summary = await loadDanmakuStorySummary(params);
  if (!summary) return undefined;

  return {
    top_liked_comments: summary.top_liked_comments.slice(0, 10),
    hot_windows: summary.hot_windows.slice(0, 5),
    episode_emotion_summary: summary.episode_emotion_summary
  };
}

