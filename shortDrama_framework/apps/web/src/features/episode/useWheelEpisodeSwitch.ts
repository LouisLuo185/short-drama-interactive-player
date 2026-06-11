import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayerStore } from "../../stores/playerStore";
import type { DramaDetail } from "../../types/drama";
import type { EpisodeDetail } from "../../types/episode";
import { useDanmuStore } from "../danmu/useDanmuStore";

export type EpisodeBoundaryMessage = "已经是第一集" | "已经是最后一集" | null;

export function useWheelEpisodeSwitch(params: {
  containerRef: RefObject<HTMLElement | null>;
  drama: DramaDetail | null;
  episode: EpisodeDetail | null;
}) {
  const navigate = useNavigate();
  const [boundaryMessage, setBoundaryMessage] = useState<EpisodeBoundaryMessage>(null);
  const lastActionAtRef = useRef(0);
  const resetPlayerState = usePlayerStore((state) => state.resetPlayerState);
  const clearCurrentEpisodeDanmuItems = useDanmuStore(
    (state) => state.clearCurrentEpisodeDanmuItems
  );

  const showBoundaryMessage = useCallback((message: EpisodeBoundaryMessage) => {
    if (!message) return;

    setBoundaryMessage(message);
    window.setTimeout(() => {
      setBoundaryMessage(null);
    }, 1500);
  }, []);

  const switchEpisode = useCallback(
    (direction: -1 | 1) => {
      if (!params.drama || !params.episode) return;

      const episodes = [...params.drama.episodes].sort((a, b) => a.episodeNo - b.episodeNo);
      const currentIndex = episodes.findIndex((episode) => episode.id === params.episode?.id);
      if (currentIndex < 0) return;

      const targetEpisode = episodes[currentIndex + direction];
      if (!targetEpisode) {
        showBoundaryMessage(direction > 0 ? "已经是最后一集" : "已经是第一集");
        return;
      }

      resetPlayerState();
      clearCurrentEpisodeDanmuItems();
      navigate(`/watch/${targetEpisode.id}`);
    },
    [
      clearCurrentEpisodeDanmuItems,
      navigate,
      params.drama,
      params.episode,
      resetPlayerState,
      showBoundaryMessage
    ]
  );

  useEffect(() => {
    const container = params.containerRef.current;
    if (!container) return;

    function handleWheel(event: WheelEvent) {
      const isPlayerFullscreen = document.fullscreenElement === params.containerRef.current;
      if (!isPlayerFullscreen) return;

      event.preventDefault();
      if (Math.abs(event.deltaY) < 20) return;

      const now = Date.now();
      if (now - lastActionAtRef.current < 800) return;

      lastActionAtRef.current = now;
      switchEpisode(event.deltaY > 0 ? 1 : -1);
    }

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [params.containerRef, switchEpisode]);

  return {
    boundaryMessage,
    switchEpisode
  };
}
