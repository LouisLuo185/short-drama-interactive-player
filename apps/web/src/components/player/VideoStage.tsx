import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlaybackAnalyticsType } from "../../features/analytics/analyticsClient";
import { DanmuOverlay } from "../../features/danmu/DanmuOverlay";
import type { DanmuItem } from "../../features/danmu/danmuTypes";
import type { TimelineUpdateReason } from "../../features/timeline/timelineScheduler";
import { adaptHighlightMarkersToInteractionHighlights } from "../../features/interactions/adapters/highlightInteractionAdapter";
import { useInteractionAudio } from "../../features/interactions/audio/useInteractionAudio";
import { EmojiEffectLayer } from "../../features/interactions/components/EmojiEffectLayer";
import { HighlightInteractionScheduler } from "../../features/interactions/components/HighlightInteractionScheduler";
import { InteractionOverlay } from "../../features/interactions/components/InteractionOverlay";
import type {
  AnimatedEmojiInteraction,
  InteractionHighlight
} from "../../features/interactions/types/interactionTypes";
import {
  logEmojiClick,
  logInteractionEvent
} from "../../features/interactions/utils/interactionLogger";
import type { InteractionPluginContext } from "../../types/interaction";
import type { PlayerController } from "../../types/player";
import type { TimelineEvent } from "../../types/timeline";
import type { HighlightMarker } from "../../types/highlightMarker";
import { EpisodeBoundaryToast } from "./EpisodeBoundaryToast";
import { InteractionOverlayLayer } from "./InteractionOverlayLayer";
import { VideoPlayerCore } from "./VideoPlayerCore";
import type { EpisodeBoundaryMessage } from "../../features/episode/useWheelEpisodeSwitch";

type VideoStageProps = {
  episodeId: string;
  videoUrl: string;
  status: string;
  currentTimeSec: number;
  visibleEvent: TimelineEvent | null;
  highlightMarkers?: HighlightMarker[];
  isFullscreen?: boolean;
  interactionsEnabled: boolean;
  interactionContext: InteractionPluginContext | null;
  danmuItems: DanmuItem[];
  isDanmuVisible: boolean;
  boundaryMessage: EpisodeBoundaryMessage;
  onControllerReady: (controller: PlayerController) => void;
  onTimelineUpdate: (currentTimeSec: number, reason: TimelineUpdateReason) => void;
  onPlaybackEvent: (eventType: PlaybackAnalyticsType, currentTimeSec: number) => void;
  onEnded: (durationSec: number) => void;
};

export function VideoStage(props: VideoStageProps) {
  const playerRootRef = useRef<HTMLDivElement | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const interactionHighlights = useMemo(
    () =>
      props.interactionsEnabled
        ? adaptHighlightMarkersToInteractionHighlights(props.highlightMarkers ?? [])
        : [],
    [props.highlightMarkers, props.interactionsEnabled]
  );
  const [activeHighlight, setActiveHighlight] = useState<InteractionHighlight | null>(null);
  const [activeInteraction, setActiveInteraction] = useState<AnimatedEmojiInteraction | null>(null);
  const [activeEffectHighlightId, setActiveEffectHighlightId] = useState<string | null>(null);
  const { playInteractionAudio } = useInteractionAudio();

  useEffect(() => {
    if (props.interactionsEnabled) return;

    setActiveHighlight(null);
    setActiveInteraction(null);
    setActiveEffectHighlightId(null);
  }, [props.interactionsEnabled]);

  useEffect(() => {
    setVideoElement(playerRootRef.current?.querySelector("video") ?? null);
  }, [props.videoUrl]);

  const handleSelectInteraction = useCallback(
    (interaction: AnimatedEmojiInteraction) => {
      if (activeHighlight) {
        logEmojiClick(activeHighlight, interaction, props.currentTimeSec);
      }
      setActiveEffectHighlightId(activeHighlight?.highlight_id ?? null);
      setActiveInteraction(interaction);
      void playInteractionAudio(interaction).then((result) => {
        logInteractionEvent({
          event_type:
            result === "played"
              ? "audio_sfx_played"
              : result === "failed"
                ? "audio_sfx_failed"
                : "audio_sfx_skipped",
          highlight_id: activeHighlight?.highlight_id ?? interaction.interaction_id,
          interaction_id: interaction.interaction_id,
          interaction_type: interaction.interaction_type,
          asset_id: interaction.audio_asset_id,
          current_time: props.currentTimeSec
        });
      });
    },
    [activeHighlight, playInteractionAudio, props.currentTimeSec]
  );

  const handleDismissInteraction = useCallback(
    (reason: "manual" | "timeout") => {
      if (activeHighlight) {
        logInteractionEvent({
          event_type: reason === "manual" ? "interaction_dismissed" : "interaction_timeout",
          highlight_id: activeHighlight.highlight_id,
          current_time: props.currentTimeSec
        });
      }
      setActiveHighlight(null);
    },
    [activeHighlight, props.currentTimeSec]
  );

  const handleEffectComplete = useCallback(() => {
    setActiveInteraction(null);
    setActiveEffectHighlightId(null);
  }, []);

  const handleEffectResult = useCallback(
    (result: "played" | "failed" | "fallback") => {
      if (!activeInteraction) return;

      logInteractionEvent({
        event_type:
          result === "played"
            ? "emoji_effect_played"
            : result === "failed"
              ? "emoji_effect_failed"
              : "emoji_effect_fallback",
        highlight_id: activeEffectHighlightId ?? activeInteraction.interaction_id,
        interaction_id: activeInteraction.interaction_id,
        interaction_type: activeInteraction.interaction_type,
        asset_id: activeInteraction.asset_id,
        current_time: props.currentTimeSec
      });
    },
    [activeEffectHighlightId, activeInteraction, props.currentTimeSec]
  );

  return (
    <div
      ref={playerRootRef}
      data-reaction-player-root
      className={[
        "relative overflow-hidden bg-black shadow-2xl shadow-black/50",
        props.isFullscreen
          ? "h-screen rounded-none border-0"
          : "rounded-[2rem] border border-amber-200/15"
      ].join(" ")}
    >
      <div className={props.isFullscreen ? "h-full" : "aspect-video"}>
        <VideoPlayerCore
          episodeId={props.episodeId}
          videoUrl={props.videoUrl}
          onControllerReady={props.onControllerReady}
          onTimelineUpdate={props.onTimelineUpdate}
          onPlaybackEvent={props.onPlaybackEvent}
          onEnded={props.onEnded}
        />
      </div>
      <DanmuOverlay
        currentTimeSec={props.currentTimeSec}
        danmuItems={props.danmuItems}
        enabled={props.isDanmuVisible}
        isPlaying={props.status === "playing"}
      />
      <InteractionOverlayLayer
        visibleEvent={props.visibleEvent}
        context={props.interactionsEnabled ? props.interactionContext : null}
      />
      {props.interactionsEnabled ? (
        <>
          <HighlightInteractionScheduler
            currentTime={props.currentTimeSec}
            isPlaying={props.status === "playing"}
            highlights={interactionHighlights}
            onActivateHighlight={setActiveHighlight}
          />
          <InteractionOverlay
            highlight={activeHighlight}
            videoElement={videoElement}
            playerElement={playerRootRef.current}
            onSelectInteraction={handleSelectInteraction}
            onDismiss={handleDismissInteraction}
          />
          <EmojiEffectLayer
            activeInteraction={activeInteraction}
            videoElement={videoElement}
            playerElement={playerRootRef.current}
            onComplete={handleEffectComplete}
            onEffectResult={handleEffectResult}
          />
        </>
      ) : null}
      <EpisodeBoundaryToast message={props.boundaryMessage} />
    </div>
  );
}
