import type { TimelineEvent } from "../../types/timeline";

export type TimelineUpdateReason = "timeupdate" | "seeked" | "ended" | "system";

export type TimelineEventTrigger = {
  event: TimelineEvent;
  currentTimeSec: number;
  reason: TimelineUpdateReason;
};

export type TimelineEventScheduler = {
  loadEvents: (events: TimelineEvent[]) => void;
  reset: () => void;
  updateCurrentTime: (
    currentTimeSec: number,
    reason: TimelineUpdateReason
  ) => TimelineEventTrigger | null;
  markTriggered: (eventId: string) => void;
  getActiveEvent: () => TimelineEvent | null;
  getVisibleEvent: (currentTimeSec: number) => TimelineEvent | null;
  getTriggeredEventIds: () => string[];
};

export function createTimelineEventScheduler(): TimelineEventScheduler {
  let events: TimelineEvent[] = [];
  let activeEvent: TimelineEvent | null = null;
  let visibleEvent: TimelineEvent | null = null;
  const triggeredEventIds = new Set<string>();

  function getVisibleCandidates(currentTimeSec: number) {
    return events.filter(
      (event) => currentTimeSec >= event.startTimeSec && currentTimeSec <= event.endTimeSec
    );
  }

  return {
    loadEvents: (nextEvents) => {
      events = [...nextEvents].sort((a, b) => a.startTimeSec - b.startTimeSec);
      activeEvent = null;
      visibleEvent = null;
      triggeredEventIds.clear();
    },
    reset: () => {
      events = [];
      activeEvent = null;
      visibleEvent = null;
      triggeredEventIds.clear();
    },
    updateCurrentTime: (currentTimeSec, reason) => {
      const visibleCandidates = getVisibleCandidates(currentTimeSec);

      if (visibleCandidates.length === 0) {
        activeEvent = null;
        visibleEvent = null;
        return null;
      }

      const selected = selectByPriorityAndTime(visibleCandidates, currentTimeSec);
      visibleEvent = selected;

      if (selected.showOnce && triggeredEventIds.has(selected.id)) {
        activeEvent = null;
        return null;
      }

      activeEvent = selected;

      if (selected.showOnce) {
        triggeredEventIds.add(selected.id);
      }

      return {
        event: selected,
        currentTimeSec,
        reason
      };
    },
    markTriggered: (eventId) => {
      triggeredEventIds.add(eventId);
    },
    getActiveEvent: () => activeEvent,
    getVisibleEvent: (currentTimeSec) => {
      const visibleCandidates = getVisibleCandidates(currentTimeSec);

      if (visibleCandidates.length === 0) {
        visibleEvent = null;
        return null;
      }

      visibleEvent = selectByPriorityAndTime(visibleCandidates, currentTimeSec);
      return visibleEvent;
    },
    getTriggeredEventIds: () => [...triggeredEventIds]
  };
}

function selectByPriorityAndTime(events: TimelineEvent[], currentTimeSec: number) {
  return [...events].sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }

    return Math.abs(a.startTimeSec - currentTimeSec) - Math.abs(b.startTimeSec - currentTimeSec);
  })[0];
}
