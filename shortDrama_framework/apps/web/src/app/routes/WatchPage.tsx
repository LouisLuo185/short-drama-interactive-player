import { Link, useParams } from "react-router-dom";
import { PlayerShell } from "../../components/player/PlayerShell";
import { useEpisodeDanmuSync } from "../../features/danmu/useEpisodeDanmuSync";
import { useEpisodeHighlightMarkers } from "../../features/highlights/useEpisodeHighlightMarkers";
import { usePlaybackAnalytics } from "../../features/analytics/usePlaybackAnalytics";
import { usePlayerRuntime } from "../../features/player/usePlayerRuntime";
import { useTimelineRuntime } from "../../features/timeline/useTimelineRuntime";
import { useWatchEpisode } from "../../features/watch/useWatchEpisode";
import { usePlayerStore } from "../../stores/playerStore";

export function WatchPage() {
  const { episodeId } = useParams();
  const { drama, episode, timelineEvents, isLoading, error } = useWatchEpisode(episodeId);
  const { markers: highlightMarkers, refresh: refreshHighlightMarkers } = useEpisodeHighlightMarkers(episode?.id);
  const { reportPlaybackEvent, reportInteractionEvent } = usePlaybackAnalytics(episode);
  const { controller, setController, interactionContext } = usePlayerRuntime({
    episodeId: episode?.id ?? null,
    reportInteractionEvent
  });
  const { handleTimelineUpdate, handleEnded } = useTimelineRuntime({
    episode,
    timelineEvents
  });
  useEpisodeDanmuSync({ drama, episode });

  const status = usePlayerStore((state) => state.status);
  const currentTimeSec = usePlayerStore((state) => state.currentTimeSec);
  const visibleEvent = usePlayerStore((state) => state.visibleEvent);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#33200f,transparent_34%),linear-gradient(180deg,#080706,#15100b)] px-5 py-8 text-amber-50 md:px-8 md:py-12">
      <section className="mx-auto max-w-6xl">
        <Link className="text-sm font-semibold text-amber-300 hover:text-amber-200" to="/dramas">
          返回短剧列表
        </Link>

        {isLoading ? (
          <StateCard title="正在加载剧集" description="正在请求 episode、drama 和 highlights 数据。" />
        ) : null}
        {error ? <StateCard title="加载失败" description={error} /> : null}

        {!isLoading && !error && drama && episode ? (
          <PlayerShell
            drama={drama}
            episode={episode}
            status={status}
            currentTimeSec={currentTimeSec}
            visibleEvent={visibleEvent}
            highlightMarkers={highlightMarkers}
            onHighlightOverridesSaved={refreshHighlightMarkers}
            interactionContext={interactionContext}
            controller={controller}
            onControllerReady={setController}
            onTimelineUpdate={handleTimelineUpdate}
            onPlaybackEvent={reportPlaybackEvent}
            onEnded={handleEnded}
          />
        ) : null}
      </section>
    </main>
  );
}

function StateCard(props: { title: string; description: string }) {
  return (
    <div className="mt-10 rounded-3xl border border-amber-200/15 bg-black/25 p-6 text-amber-50 shadow-2xl shadow-black/20">
      <h2 className="text-xl font-bold">{props.title}</h2>
      <p className="mt-2 text-amber-50/65">{props.description}</p>
    </div>
  );
}
