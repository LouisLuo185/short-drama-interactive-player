import { useEffect, useState } from "react";
import Lottie from "lottie-react";
import type { AnimatedEmojiInteraction } from "../types/interactionTypes";
import { getVideoTopRightAnchor } from "../reactionWheel/getVideoContentAnchor";

type EmojiEffectLayerProps = {
  activeInteraction: AnimatedEmojiInteraction | null;
  videoElement: HTMLVideoElement | null;
  playerElement: HTMLElement | null;
  onComplete: () => void;
  onEffectResult?: (result: "played" | "failed" | "fallback") => void;
};

const animationDataCache = new Map<string, Promise<unknown>>();

export function EmojiEffectLayer(props: EmojiEffectLayerProps) {
  const [animationData, setAnimationData] = useState<unknown | null>(null);
  const [shouldUseFallback, setShouldUseFallback] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const interaction = props.activeInteraction;
    if (!interaction) {
      setAnimationData(null);
      setShouldUseFallback(false);
      return;
    }

    let cancelled = false;
    const durationMs = getDuration(interaction);

    setAnimationData(null);
    setShouldUseFallback(false);

    if (interaction.asset_url) {
      loadAnimationData(interaction.asset_url)
        .then((data) => {
          if (cancelled) return;
          setAnimationData(data);
          props.onEffectResult?.("played");
        })
        .catch(() => {
          if (cancelled) return;
          setAnimationData(null);
          setShouldUseFallback(true);
          props.onEffectResult?.("fallback");
        });
    } else {
      setAnimationData(null);
      setShouldUseFallback(true);
      props.onEffectResult?.("fallback");
    }

    const timer = window.setTimeout(() => {
      if (!cancelled) {
        props.onComplete();
      }
    }, durationMs + 160);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [props.activeInteraction, props.onComplete, props.onEffectResult]);

  useEffect(() => {
    if (!props.activeInteraction) return;

    const updateAnchor = () => {
      setAnchor(
        getVideoTopRightAnchor({
          videoElement: props.videoElement,
          playerElement: props.playerElement,
          anchor: "video_right_middle",
          offsetX: 20,
          offsetY: 0
        })
      );
    };

    updateAnchor();
    window.addEventListener("resize", updateAnchor);
    window.addEventListener("orientationchange", updateAnchor);

    return () => {
      window.removeEventListener("resize", updateAnchor);
      window.removeEventListener("orientationchange", updateAnchor);
    };
  }, [props.activeInteraction, props.playerElement, props.videoElement]);

  if (!props.activeInteraction) {
    return null;
  }

  const durationMs = getDuration(props.activeInteraction);
  const fallbackEmoji = props.activeInteraction.fallback_emoji ?? "\u2728";

  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      <div
        key={props.activeInteraction.interaction_id}
        className="absolute grid h-32 w-32 -translate-x-1/2 -translate-y-1/2 place-items-center animate-[emojiPop_1.15s_ease-out_forwards] rounded-full bg-black/10 shadow-2xl shadow-black/30 backdrop-blur-[1px] md:h-36 md:w-36"
        style={{
          left: anchor.x,
          top: anchor.y,
          animationDuration: `${durationMs}ms`
        }}
      >
        <div className="absolute inset-0 grid place-items-center text-7xl leading-none drop-shadow-[0_10px_28px_rgba(0,0,0,0.7)] md:text-8xl">
          {fallbackEmoji}
        </div>
        {animationData && !shouldUseFallback ? (
          <div className="relative z-10 grid h-full w-full place-items-center">
            <Lottie
              key={`${props.activeInteraction.interaction_id}:${props.activeInteraction.asset_id}`}
              animationData={animationData}
              loop={false}
              autoplay
              className="h-28 w-28 max-w-[22vw] md:h-32 md:w-32"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function getDuration(interaction: AnimatedEmojiInteraction) {
  if (Number.isFinite(interaction.duration_ms)) {
    return Math.max(900, Math.min(interaction.duration_ms, 1800));
  }

  return 1300;
}

function loadAnimationData(assetUrl: string) {
  const cached = animationDataCache.get(assetUrl);
  if (cached) return cached;

  const request = fetch(assetUrl).then((response) => {
    if (!response.ok) {
      throw new Error(`Emoji asset request failed: ${response.status}`);
    }

    return response.json() as Promise<unknown>;
  });

  animationDataCache.set(assetUrl, request);
  return request;
}
