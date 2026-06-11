export type PlayerStatus =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "seeking"
  | "ended"
  | "error";

export type PlayerSnapshot = {
  episodeId: string;
  currentTimeSec: number;
  durationSec: number;
  status: PlayerStatus;
  volume: number;
  muted: boolean;
};

export type PlayerController = {
  play: () => Promise<void>;
  pause: () => void;
  seekTo: (timeSec: number) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  getSnapshot: () => PlayerSnapshot;
};
