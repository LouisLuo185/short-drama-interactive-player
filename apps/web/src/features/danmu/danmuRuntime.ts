import type { DanmuItem } from "./danmuTypes";

export const DANMU_DURATION_SEC = 10;
export const DANMU_TRACK_COUNT = 6;
export const MAX_LAUNCH_PER_TICK = 6;
export const TRACK_LAUNCH_GAP_SEC = 1.35;
export const SEEK_RESET_THRESHOLD_SEC = 1.5;

export type FlyingDanmu = {
  flightId: string;
  item: DanmuItem;
  trackIndex: number;
};

export function sortDanmuByTime(items: DanmuItem[]) {
  return [...items].sort((a, b) => {
    const timeDiff = a.timeSec - b.timeSec;
    if (timeDiff !== 0) return timeDiff;

    return (b.likeCount ?? 0) - (a.likeCount ?? 0);
  });
}

export function findDanmuStartIndex(items: DanmuItem[], currentTimeSec: number) {
  let left = 0;
  let right = items.length;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (items[mid].timeSec < currentTimeSec) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  return left;
}

export function getAvailableTrack(
  trackLastLaunchTimeSec: number[],
  currentTimeSec: number
) {
  for (let trackIndex = 0; trackIndex < DANMU_TRACK_COUNT; trackIndex += 1) {
    if (currentTimeSec - trackLastLaunchTimeSec[trackIndex] >= TRACK_LAUNCH_GAP_SEC) {
      return trackIndex;
    }
  }

  return null;
}
