import { useCallback, useEffect, useRef } from "react";
import type { AnimatedEmojiInteraction } from "../types/interactionTypes";

export type InteractionAudioResult = "played" | "failed" | "skipped";

export function useInteractionAudio() {
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      stopAudio(activeAudioRef.current);
      activeAudioRef.current = null;
    };
  }, []);

  const playInteractionAudio = useCallback(async (interaction: AnimatedEmojiInteraction) => {
    if (!interaction.audio_url) {
      return "skipped" as InteractionAudioResult;
    }

    try {
      stopAudio(activeAudioRef.current);

      const audio = new Audio(interaction.audio_url);
      audio.volume = clamp(interaction.audio_volume ?? 0.3, 0.2, 0.4);
      activeAudioRef.current = audio;

      const timeout = window.setTimeout(() => {
        stopAudio(audio);
      }, clamp(interaction.audio_duration_ms ?? 1000, 300, 1200));

      audio.onended = () => {
        window.clearTimeout(timeout);
        if (activeAudioRef.current === audio) {
          activeAudioRef.current = null;
        }
      };

      await audio.play();
      return "played" as InteractionAudioResult;
    } catch {
      return "failed" as InteractionAudioResult;
    }
  }, []);

  return { playInteractionAudio };
}

function stopAudio(audio: HTMLAudioElement | null) {
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
