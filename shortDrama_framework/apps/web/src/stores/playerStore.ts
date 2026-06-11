import { create } from "zustand";
import type { PlayerStatus } from "../types/player";
import type { TimelineEvent } from "../types/timeline";

export type PlayerStoreState = {
  episodeId: string | null;
  videoUrl: string | null;
  status: PlayerStatus;
  currentTimeSec: number;
  durationSec: number;
  activeEvent: TimelineEvent | null;
  visibleEvent: TimelineEvent | null;
  timelineEvents: TimelineEvent[];
  triggeredEventIds: string[];
  submittedActionEventIds: string[];
  setEpisode: (episodeId: string, videoUrl: string) => void;
  setStatus: (status: PlayerStatus) => void;
  setCurrentTimeSec: (timeSec: number) => void;
  setDurationSec: (durationSec: number) => void;
  setTimelineEvents: (events: TimelineEvent[]) => void;
  setActiveEvent: (event: TimelineEvent | null) => void;
  setVisibleEvent: (event: TimelineEvent | null) => void;
  setTriggeredEventIds: (eventIds: string[]) => void;
  markEventTriggered: (eventId: string) => void;
  markActionSubmitted: (eventId: string) => void;
  resetPlayerState: () => void;
};

const initialState = {
  episodeId: null,
  videoUrl: null,
  status: "idle" as PlayerStatus,
  currentTimeSec: 0,
  durationSec: 0,
  activeEvent: null,
  visibleEvent: null,
  timelineEvents: [],
  triggeredEventIds: [],
  submittedActionEventIds: []
};

export const usePlayerStore = create<PlayerStoreState>((set) => ({
  ...initialState,
  setEpisode: (episodeId, videoUrl) =>
    set({
      ...initialState,
      episodeId,
      videoUrl,
      status: "loading"
    }),
  setStatus: (status) => set({ status }),
  setCurrentTimeSec: (currentTimeSec) => set({ currentTimeSec }),
  setDurationSec: (durationSec) => set({ durationSec }),
  setTimelineEvents: (timelineEvents) => set({ timelineEvents }),
  setActiveEvent: (activeEvent) => set({ activeEvent }),
  setVisibleEvent: (visibleEvent) => set({ visibleEvent }),
  setTriggeredEventIds: (triggeredEventIds) => set({ triggeredEventIds }),
  markEventTriggered: (eventId) =>
    set((state) => ({
      triggeredEventIds: state.triggeredEventIds.includes(eventId)
        ? state.triggeredEventIds
        : [...state.triggeredEventIds, eventId]
    })),
  markActionSubmitted: (eventId) =>
    set((state) => ({
      submittedActionEventIds: state.submittedActionEventIds.includes(eventId)
        ? state.submittedActionEventIds
        : [...state.submittedActionEventIds, eventId]
    })),
  resetPlayerState: () => set(initialState)
}));
