import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { getArcPositions, getNearestOptionIndex } from "./reactionWheelMath";
import type {
  ReactionOption,
  ReactionWheelConfig,
  ReactionWheelState
} from "./reactionWheelTypes";

type UseReactionWheelInput = {
  config: ReactionWheelConfig;
  anchor: { x: number; y: number };
  onSelect: (option: ReactionOption) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

const CLOSE_FADE_MS = 260;
const COOLDOWN_MS = CLOSE_FADE_MS;

export function useReactionWheel(input: UseReactionWheelInput) {
  const [state, setState] = useState<ReactionWheelState>("idle");
  const [pressProgress, setPressProgress] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const [selectedOption, setSelectedOption] = useState<ReactionOption | null>(null);
  const pressStartedAtRef = useRef(0);
  const longPressTimerRef = useRef<number | null>(null);
  const progressFrameRef = useRef<number | null>(null);
  const cooldownTimerRef = useRef<number | null>(null);
  const stateRef = useRef<ReactionWheelState>("idle");
  const onSelectRef = useRef(input.onSelect);
  const onOpenRef = useRef(input.onOpen);
  const onCloseRef = useRef(input.onClose);

  const options = input.config.wheelOptions.slice(0, input.config.wheel.maxOptions);
  const positions = useMemo(
    () =>
      getArcPositions(
        options.length,
        input.config.wheel.radiusPx,
        input.config.wheel.arcStartDeg,
        input.config.wheel.arcEndDeg
      ),
    [
      input.config.wheel.arcEndDeg,
      input.config.wheel.arcStartDeg,
      input.config.wheel.radiusPx,
      options.length
    ]
  );

  const clearTimers = useCallback(() => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (progressFrameRef.current) {
      window.cancelAnimationFrame(progressFrameRef.current);
      progressFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    onSelectRef.current = input.onSelect;
    onOpenRef.current = input.onOpen;
    onCloseRef.current = input.onClose;
  }, [input.onClose, input.onOpen, input.onSelect]);

  useEffect(() => {
    return () => {
      clearTimers();
      if (cooldownTimerRef.current) {
        window.clearTimeout(cooldownTimerRef.current);
      }
    };
  }, [clearTimers]);

  const enterCooldown = useCallback(() => {
    setState("cooldown");
    cooldownTimerRef.current = window.setTimeout(() => {
      setState("idle");
      stateRef.current = "idle";
      setSelectedOption(null);
      setHoveredIndex(-1);
      setPressProgress(0);
    }, COOLDOWN_MS);
  }, []);

  const selectOption = useCallback(
    (option: ReactionOption) => {
      clearTimers();
      setState("selected");
      setSelectedOption(option);
      setHoveredIndex(-1);
      setPressProgress(0);
      onSelectRef.current(option);
    },
    [clearTimers]
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (stateRef.current === "cooldown" || stateRef.current === "selected") return;

      event.currentTarget.setPointerCapture(event.pointerId);
      pressStartedAtRef.current = performance.now();
      setState("pressing");
      setPressProgress(0);

      const updateProgress = () => {
        const elapsed = performance.now() - pressStartedAtRef.current;
        setPressProgress(Math.min(1, elapsed / input.config.wheel.longPressMs));
        progressFrameRef.current = window.requestAnimationFrame(updateProgress);
      };

      progressFrameRef.current = window.requestAnimationFrame(updateProgress);
      longPressTimerRef.current = window.setTimeout(() => {
        if (progressFrameRef.current) {
          window.cancelAnimationFrame(progressFrameRef.current);
          progressFrameRef.current = null;
        }
        setState("expanded");
        stateRef.current = "expanded";
        setPressProgress(1);
        onOpenRef.current?.();
      }, input.config.wheel.longPressMs);
    },
    [input.config.wheel.longPressMs]
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (stateRef.current !== "expanded" && stateRef.current !== "selecting") return;

      const playerRect = event.currentTarget.closest("[data-reaction-player-root]")?.getBoundingClientRect();
      if (!playerRect) return;

      const nearestIndex = getNearestOptionIndex({
        pointerX: event.clientX - playerRect.left,
        pointerY: event.clientY - playerRect.top,
        anchorX: input.anchor.x,
        anchorY: input.anchor.y,
        positions,
        hitTargetPx: input.config.wheel.hitTargetPx
      });

      setHoveredIndex(nearestIndex);
      setState(nearestIndex >= 0 ? "selecting" : "expanded");
    },
    [input.anchor.x, input.anchor.y, input.config.wheel.hitTargetPx, positions]
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      const currentState = stateRef.current;
      const selectedByDrag = currentState === "expanded" || currentState === "selecting";

      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer capture can already be released by the browser on cancel.
      }

      if (selectedByDrag) {
        const option = hoveredIndex >= 0 ? options[hoveredIndex] : null;
        clearTimers();
        if (option) {
          selectOption(option);
        } else {
          setState("expanded");
          stateRef.current = "expanded";
          setPressProgress(1);
        }
        return;
      }

      if (currentState === "pressing") {
        selectOption(input.config.defaultReaction);
      }
    },
    [clearTimers, hoveredIndex, input.config.defaultReaction, options, selectOption]
  );

  const handlePointerCancel = useCallback(() => {
    clearTimers();
    setState("idle");
    setHoveredIndex(-1);
    setPressProgress(0);
    onCloseRef.current?.();
  }, [clearTimers]);

  const handleOptionClick = useCallback(
    (option: ReactionOption) => {
      selectOption(option);
    },
    [selectOption]
  );

  const handleFeedbackComplete = useCallback(() => {
    enterCooldown();
    window.setTimeout(() => {
      onCloseRef.current?.();
    }, CLOSE_FADE_MS);
  }, [enterCooldown]);

  return {
    state,
    pressProgress,
    hoveredIndex,
    selectedOption,
    options,
    positions,
    isExpanded: state === "expanded" || state === "selecting",
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleOptionClick,
    handleFeedbackComplete
  };
}
