import { useEffect, useMemo, useRef, useState } from "react";
import type { DanmuItem } from "./danmuTypes";
import {
  DANMU_TRACK_COUNT,
  MAX_LAUNCH_PER_TICK,
  SEEK_RESET_THRESHOLD_SEC,
  type FlyingDanmu,
  findDanmuStartIndex,
  getAvailableTrack,
  sortDanmuByTime
} from "./danmuRuntime";

type UseDanmuRuntimeParams = {
  currentTimeSec: number;
  danmuItems: DanmuItem[];
  enabled: boolean;
  isPlaying: boolean;
};

export function useDanmuRuntime(params: UseDanmuRuntimeParams) {
  const sortedDanmuItems = useMemo(
    () => sortDanmuByTime(params.danmuItems),
    [params.danmuItems]
  );
  const [flyingDanmu, setFlyingDanmu] = useState<FlyingDanmu[]>([]);
  const nextIndexRef = useRef(0);
  const lastVideoTimeRef = useRef(0);
  const launchSequenceRef = useRef(0);
  const trackLastLaunchTimeSecRef = useRef(
    Array.from({ length: DANMU_TRACK_COUNT }, () => -Infinity)
  );

  useEffect(() => {
    const currentTimeSec = params.currentTimeSec;

    nextIndexRef.current = findDanmuStartIndex(sortedDanmuItems, currentTimeSec);
    lastVideoTimeRef.current = currentTimeSec;
    trackLastLaunchTimeSecRef.current = Array.from(
      { length: DANMU_TRACK_COUNT },
      () => -Infinity
    );
    setFlyingDanmu([]);
  }, [sortedDanmuItems]);

  useEffect(() => {
    if (!params.enabled) {
      setFlyingDanmu([]);
      return;
    }

    if (!params.isPlaying || sortedDanmuItems.length === 0) {
      return;
    }

    const previousTimeSec = lastVideoTimeRef.current;
    const currentTimeSec = params.currentTimeSec;
    const isSeekLikeJump =
      currentTimeSec < previousTimeSec ||
      Math.abs(currentTimeSec - previousTimeSec) > SEEK_RESET_THRESHOLD_SEC;

    if (isSeekLikeJump) {
      nextIndexRef.current = findDanmuStartIndex(sortedDanmuItems, currentTimeSec);
      trackLastLaunchTimeSecRef.current = Array.from(
        { length: DANMU_TRACK_COUNT },
        () => -Infinity
      );
      setFlyingDanmu([]);
      lastVideoTimeRef.current = currentTimeSec;
      return;
    }

    const launched: FlyingDanmu[] = [];

    while (
      nextIndexRef.current < sortedDanmuItems.length &&
      sortedDanmuItems[nextIndexRef.current].timeSec <= currentTimeSec &&
      launched.length < MAX_LAUNCH_PER_TICK
    ) {
      const item = sortedDanmuItems[nextIndexRef.current];
      nextIndexRef.current += 1;

      if (item.timeSec < previousTimeSec - 0.1) {
        continue;
      }

      const trackIndex = getAvailableTrack(
        trackLastLaunchTimeSecRef.current,
        currentTimeSec
      );

      if (trackIndex === null) {
        continue;
      }

      trackLastLaunchTimeSecRef.current[trackIndex] = currentTimeSec;
      launchSequenceRef.current += 1;
      launched.push({
        flightId: `${item.id}-${launchSequenceRef.current}`,
        item,
        trackIndex
      });
    }

    if (launched.length > 0) {
      setFlyingDanmu((current) => [...current, ...launched]);
    }

    lastVideoTimeRef.current = currentTimeSec;
  }, [
    params.currentTimeSec,
    params.enabled,
    params.isPlaying,
    sortedDanmuItems
  ]);

  const removeFlyingDanmu = (flightId: string) => {
    setFlyingDanmu((current) => current.filter((item) => item.flightId !== flightId));
  };

  return {
    flyingDanmu,
    removeFlyingDanmu
  };
}
