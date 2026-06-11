import { usePlayerStore } from "../../stores/playerStore";

export function PlayerDebugPanel() {
  const episodeId = usePlayerStore((state) => state.episodeId);
  const status = usePlayerStore((state) => state.status);
  const currentTimeSec = usePlayerStore((state) => state.currentTimeSec);
  const durationSec = usePlayerStore((state) => state.durationSec);
  const activeEvent = usePlayerStore((state) => state.activeEvent);
  const visibleEvent = usePlayerStore((state) => state.visibleEvent);
  const triggeredEventIds = usePlayerStore((state) => state.triggeredEventIds);
  const timelineEvents = usePlayerStore((state) => state.timelineEvents);

  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <pre className="mt-4 overflow-auto rounded-2xl border border-amber-200/10 bg-black/45 p-4 text-xs leading-6 text-amber-50/65">
      {JSON.stringify(
        {
          episodeId,
          currentTimeSec: Number(currentTimeSec.toFixed(2)),
          durationSec: Number(durationSec.toFixed(2)),
          status,
          activeEvent: activeEvent?.id ?? null,
          visibleEvent: visibleEvent?.id ?? null,
          triggeredEventIds,
          highlightCount: timelineEvents.filter((event) => event.source === "highlight_api").length
        },
        null,
        2
      )}
    </pre>
  );
}
