import type { EpisodeBoundaryMessage } from "../../features/episode/useWheelEpisodeSwitch";

export function EpisodeBoundaryToast(props: { message: EpisodeBoundaryMessage }) {
  if (!props.message) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute left-1/2 top-5 z-30 -translate-x-1/2 rounded-full border border-amber-200/25 bg-black/75 px-5 py-3 text-sm font-black text-amber-100 shadow-2xl shadow-black/45 backdrop-blur">
      {props.message}
    </div>
  );
}
