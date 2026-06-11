import { useCallback, useRef, useState } from "react";
import type { PlaybackAnalyticsType } from "../../features/analytics/analyticsClient";
import { DanmuImportPanel } from "../../features/danmu/DanmuImportPanel";
import { useDanmuStore } from "../../features/danmu/useDanmuStore";
import { useWheelEpisodeSwitch } from "../../features/episode/useWheelEpisodeSwitch";
import { HighlightReviewPanel } from "../../features/highlightReview/HighlightReviewPanel";
import { useAutoHideControls } from "../../features/player/useAutoHideControls";
import { useFullscreen } from "../../features/player/useFullscreen";
import type { TimelineUpdateReason } from "../../features/timeline/timelineScheduler";
import type { DramaDetail } from "../../types/drama";
import type { EpisodeDetail } from "../../types/episode";
import type { HighlightMarker } from "../../types/highlightMarker";
import type { InteractionPluginContext } from "../../types/interaction";
import type { PlayerController } from "../../types/player";
import type { TimelineEvent } from "../../types/timeline";
import { PlayerControls } from "./PlayerControls";
import { PlayerManagementDrawer } from "./PlayerManagementDrawer";
import { VideoStage } from "./VideoStage";

type PlayerShellProps = {
  drama: DramaDetail;
  episode: EpisodeDetail;
  status: string;
  currentTimeSec: number;
  visibleEvent: TimelineEvent | null;
  highlightMarkers?: HighlightMarker[];
  onHighlightOverridesSaved?: () => void;
  interactionContext: InteractionPluginContext | null;
  controller: PlayerController | null;
  onControllerReady: (controller: PlayerController) => void;
  onTimelineUpdate: (currentTimeSec: number, reason: TimelineUpdateReason) => void;
  onPlaybackEvent: (eventType: PlaybackAnalyticsType, currentTimeSec: number) => void;
  onEnded: (durationSec: number) => void;
};

export function PlayerShell(props: PlayerShellProps) {
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const [interactionsEnabled, setInteractionsEnabled] = useState(true);
  const { isFullscreen, toggleFullscreen } = useFullscreen(playerContainerRef);
  const { visible: controlsVisible } = useAutoHideControls({
    containerRef: playerContainerRef,
    enabled: isFullscreen,
    delayMs: 1000
  });
  const { boundaryMessage, switchEpisode } = useWheelEpisodeSwitch({
    containerRef: playerContainerRef,
    drama: props.drama,
    episode: props.episode
  });
  const danmuItems = useDanmuStore((state) => state.currentEpisodeDanmuItems);
  const isDanmuVisible = useDanmuStore((state) => state.isDanmuVisible);

  const handleEnded = useCallback(
    (durationSec: number) => {
      props.onEnded(durationSec);
      switchEpisode(1);
    },
    [props.onEnded, switchEpisode]
  );

  return (
    <>
      <div
        ref={playerContainerRef}
        className="relative mt-6 overflow-hidden rounded-[2rem] border border-amber-200/10 bg-black/80 p-3 shadow-2xl shadow-black/45 fullscreen:mt-0 fullscreen:flex fullscreen:h-screen fullscreen:flex-col fullscreen:justify-center fullscreen:rounded-none fullscreen:border-0 fullscreen:bg-black fullscreen:p-0"
      >
        <div className="mb-3 flex items-center justify-between gap-4 px-1 text-amber-50 fullscreen:!hidden">
          <div className="min-w-0">
            <p className="truncate text-xs font-black uppercase tracking-[0.22em] text-amber-200/60">
              {props.drama.title} · EP {String(props.episode.episodeNo).padStart(2, "0")}
            </p>
            <h1 className="mt-1 truncate text-lg font-black md:text-xl">
              {props.episode.title}
            </h1>
          </div>
          <span className="shrink-0 rounded-full border border-amber-200/15 bg-amber-300 px-3 py-1.5 text-xs font-black text-stone-950">
            {formatTime(props.episode.durationSec)}
          </span>
        </div>

        <VideoStage
          episodeId={props.episode.id}
          videoUrl={props.episode.videoUrl}
          status={props.status}
          currentTimeSec={props.currentTimeSec}
          visibleEvent={props.visibleEvent}
          highlightMarkers={props.highlightMarkers}
          isFullscreen={isFullscreen}
          interactionsEnabled={interactionsEnabled}
          interactionContext={props.interactionContext}
          danmuItems={danmuItems}
          isDanmuVisible={isDanmuVisible}
          boundaryMessage={boundaryMessage}
          onControllerReady={props.onControllerReady}
          onTimelineUpdate={props.onTimelineUpdate}
          onPlaybackEvent={props.onPlaybackEvent}
          onEnded={handleEnded}
        />

        <div
          className={[
            "transition duration-300",
            isFullscreen
              ? [
                  "pointer-events-none absolute inset-x-0 bottom-0 z-50 px-4 pb-5 pt-24",
                  "bg-gradient-to-t from-black/82 via-black/36 to-transparent",
                  controlsVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                ].join(" ")
              : "mt-4 opacity-100"
          ].join(" ")}
        >
          <div className={isFullscreen ? "pointer-events-auto mx-auto max-w-5xl" : ""}>
            {false ? (
              <div className="mb-2 px-2 text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-white/74">
                  {props.drama.title} · EP {String(props.episode.episodeNo).padStart(2, "0")}
                </p>
                <h1 className="mt-1 truncate text-base font-black text-white md:text-lg">
                  {props.episode.title}
                </h1>
              </div>
            ) : null}

            <PlayerControls
              controller={props.controller}
              isFullscreen={isFullscreen}
              interactionsEnabled={interactionsEnabled}
              highlightMarkers={props.highlightMarkers}
              onSwitchEpisode={switchEpisode}
              onToggleInteractions={() => setInteractionsEnabled((enabled) => !enabled)}
              onToggleFullscreen={() => void toggleFullscreen()}
            />
          </div>
        </div>
      </div>

      <PlayerManagementDrawer>
        <HighlightReviewPanel
          episodeId={props.episode.id}
          onSaved={props.onHighlightOverridesSaved}
        />
        <DanmuImportPanel drama={props.drama} episode={props.episode} />
      </PlayerManagementDrawer>
    </>
  );
}

function formatTime(totalSec: number) {
  const safeTotalSec = Number.isFinite(totalSec) ? Math.max(totalSec, 0) : 0;
  const minutes = Math.floor(safeTotalSec / 60);
  const seconds = Math.floor(safeTotalSec % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}
