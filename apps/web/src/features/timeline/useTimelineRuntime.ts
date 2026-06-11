import { useCallback, useEffect, useRef } from "react";
import { usePlayerStore } from "../../stores/playerStore";
import type { EpisodeDetail } from "../../types/episode";
import type { TimelineEvent } from "../../types/timeline";
import {
  createTimelineEventScheduler,
  type TimelineUpdateReason
} from "./timelineScheduler";

export function useTimelineRuntime(params: {
  episode: EpisodeDetail | null;
  timelineEvents: TimelineEvent[];
}) {
  const schedulerRef = useRef(createTimelineEventScheduler());
  const setActiveEvent = usePlayerStore((state) => state.setActiveEvent);
  const setVisibleEvent = usePlayerStore((state) => state.setVisibleEvent);
  const setTriggeredEventIds = usePlayerStore((state) => state.setTriggeredEventIds);

  useEffect(() => {
    const scheduler = schedulerRef.current;
    scheduler.reset();
    scheduler.loadEvents(params.timelineEvents);
    setActiveEvent(null);
    setVisibleEvent(null);
    setTriggeredEventIds([]);

    return () => {
      scheduler.reset();
    };
  }, [params.timelineEvents, setActiveEvent, setTriggeredEventIds, setVisibleEvent]);

  const handleTimelineUpdate = useCallback(
    (currentTimeSec: number, reason: TimelineUpdateReason) => {
      const scheduler = schedulerRef.current;
      const trigger = scheduler.updateCurrentTime(currentTimeSec, reason);
      const visible = scheduler.getVisibleEvent(currentTimeSec);

      setActiveEvent(trigger?.event ?? null);
      setVisibleEvent(visible);
      setTriggeredEventIds(scheduler.getTriggeredEventIds());
    },
    [setActiveEvent, setTriggeredEventIds, setVisibleEvent]
  );

  const handleEnded = useCallback(
    (_durationSec: number) => {
      if (!params.episode) return;

      setActiveEvent(null);
      setVisibleEvent(null);
    },
    [params.episode, setActiveEvent, setVisibleEvent]
  );

  return {
    handleTimelineUpdate,
    handleEnded
  };
}
