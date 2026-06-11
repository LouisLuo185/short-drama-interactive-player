import { EpisodeSwitchButton } from "./EpisodeSwitchButton";
import type { PlayerController } from "../../types/player";
import type { HighlightMarker } from "../../types/highlightMarker";
import { FullscreenButton } from "./FullscreenButton";
import { InteractionToggleButton } from "./InteractionToggleButton";
import { PlayPauseButton } from "./PlayPauseButton";
import { ProgressBar } from "./ProgressBar";
import { VolumeControl } from "./VolumeControl";

type PlayerControlsProps = {
  controller: PlayerController | null;
  isFullscreen: boolean;
  interactionsEnabled: boolean;
  highlightMarkers?: HighlightMarker[];
  onSwitchEpisode: (direction: -1 | 1) => void;
  onToggleInteractions: () => void;
  onToggleFullscreen: () => void;
};

export function PlayerControls(props: PlayerControlsProps) {
  return (
    <div
      className={[
        "border shadow-xl shadow-black/30 backdrop-blur",
        props.isFullscreen
          ? "rounded-[1.35rem] border-white/10 bg-black/28 px-3 py-3"
          : "rounded-full border-amber-200/12 bg-black/62 px-3 py-3"
      ].join(" ")}
    >
      <div
        className={[
          "flex items-center gap-3",
          props.isFullscreen ? "flex-nowrap" : "flex-wrap md:flex-nowrap"
        ].join(" ")}
      >
        <div className="flex shrink-0 items-center gap-2">
          <EpisodeSwitchButton direction="prev" onClick={() => props.onSwitchEpisode(-1)} />
          <PlayPauseButton controller={props.controller} />
          <EpisodeSwitchButton direction="next" onClick={() => props.onSwitchEpisode(1)} />
          <InteractionToggleButton
            enabled={props.interactionsEnabled}
            onToggle={props.onToggleInteractions}
          />
        </div>
        <ProgressBar
          controller={props.controller}
          highlightMarkers={props.interactionsEnabled ? props.highlightMarkers : []}
        />
        <div className="flex shrink-0 items-center gap-2">
          <VolumeControl controller={props.controller} />
          <FullscreenButton
            isFullscreen={props.isFullscreen}
            onToggleFullscreen={props.onToggleFullscreen}
          />
        </div>
      </div>
    </div>
  );
}
