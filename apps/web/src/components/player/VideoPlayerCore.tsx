import { useEffect, useRef } from "react";
import { usePlayerStore } from "../../stores/playerStore";
import type { PlayerController } from "../../types/player";
import type { TimelineUpdateReason } from "../../features/timeline/timelineScheduler";
import type { PlaybackAnalyticsType } from "../../features/analytics/analyticsClient";

type VideoPlayerCoreProps = {
  episodeId: string;
  videoUrl: string;
  onControllerReady: (controller: PlayerController) => void;
  onTimelineUpdate: (currentTimeSec: number, reason: TimelineUpdateReason) => void;
  onPlaybackEvent: (eventType: PlaybackAnalyticsType, currentTimeSec: number) => void;
  onEnded: (durationSec: number) => void;
};

export function VideoPlayerCore(props: VideoPlayerCoreProps) {
  const { episodeId, videoUrl, onControllerReady, onTimelineUpdate, onPlaybackEvent, onEnded } =
    props;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const setStatus = usePlayerStore((state) => state.setStatus);
  const setCurrentTimeSec = usePlayerStore((state) => state.setCurrentTimeSec);
  const setDurationSec = usePlayerStore((state) => state.setDurationSec);

  useEffect(() => {
    const controller: PlayerController = {
      play: async () => {
        await videoRef.current?.play();
      },
      pause: () => {
        videoRef.current?.pause();
      },
      seekTo: (timeSec) => {
        if (!videoRef.current) return;
        const nextTimeSec = clamp(timeSec, 0, videoRef.current.duration || 0);
        videoRef.current.currentTime = nextTimeSec;
        setCurrentTimeSec(nextTimeSec);
        onTimelineUpdate(nextTimeSec, "seeked");
      },
      setVolume: (volume) => {
        if (!videoRef.current) return;
        videoRef.current.volume = clamp(volume, 0, 1);
        if (volume > 0) {
          videoRef.current.muted = false;
        }
      },
      setMuted: (muted) => {
        if (!videoRef.current) return;
        videoRef.current.muted = muted;
      },
      getSnapshot: () => {
        const video = videoRef.current;
        const state = usePlayerStore.getState();

        return {
          episodeId,
          currentTimeSec: video?.currentTime ?? state.currentTimeSec,
          durationSec: video?.duration || state.durationSec,
          status: state.status,
          volume: video?.volume ?? 1,
          muted: video?.muted ?? false
        };
      }
    };

    onControllerReady(controller);
  }, [episodeId, onControllerReady, onTimelineUpdate, setCurrentTimeSec]);

  return (
    <video
      ref={videoRef}
      className="h-full w-full bg-black object-contain"
      src={videoUrl}
      playsInline
      preload="metadata"
      onLoadedMetadata={(event) => {
        const durationSec = event.currentTarget.duration || 0;
        setDurationSec(durationSec);
        setStatus("paused");
      }}
      onTimeUpdate={(event) => {
        const currentTimeSec = event.currentTarget.currentTime;
        setCurrentTimeSec(currentTimeSec);
        onTimelineUpdate(currentTimeSec, "timeupdate");
      }}
      onPlay={(event) => {
        setStatus("playing");
        onPlaybackEvent("play", event.currentTarget.currentTime);
      }}
      onPause={(event) => {
        if (!event.currentTarget.ended) {
          setStatus("paused");
          onPlaybackEvent("pause", event.currentTarget.currentTime);
        }
      }}
      onSeeking={() => setStatus("seeking")}
      onSeeked={(event) => {
        const currentTimeSec = event.currentTarget.currentTime;
        setCurrentTimeSec(currentTimeSec);
        onTimelineUpdate(currentTimeSec, "seeked");
        onPlaybackEvent("seek", currentTimeSec);
        setStatus(event.currentTarget.paused ? "paused" : "playing");
      }}
      onEnded={(event) => {
        const durationSec = event.currentTarget.duration || event.currentTarget.currentTime;
        setCurrentTimeSec(durationSec);
        setStatus("ended");
        onTimelineUpdate(durationSec, "ended");
        onPlaybackEvent("ended", durationSec);
        onEnded(durationSec);
      }}
      onError={() => setStatus("error")}
    />
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
