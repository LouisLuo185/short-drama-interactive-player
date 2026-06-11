import { useCallback, useEffect, useState, type RefObject } from "react";

export function useAutoHideControls(params: {
  containerRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  delayMs?: number;
}) {
  const [visible, setVisible] = useState(true);

  const reveal = useCallback(() => {
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!params.enabled) {
      setVisible(true);
      return;
    }

    const container = params.containerRef.current;
    if (!container) return;

    let timer = window.setTimeout(() => setVisible(false), params.delayMs ?? 1000);

    function handleActivity() {
      setVisible(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setVisible(false), params.delayMs ?? 1000);
    }

    container.addEventListener("mousemove", handleActivity);
    container.addEventListener("pointermove", handleActivity);
    container.addEventListener("click", handleActivity);
    container.addEventListener("touchstart", handleActivity, { passive: true });

    return () => {
      window.clearTimeout(timer);
      container.removeEventListener("mousemove", handleActivity);
      container.removeEventListener("pointermove", handleActivity);
      container.removeEventListener("click", handleActivity);
      container.removeEventListener("touchstart", handleActivity);
    };
  }, [params.containerRef, params.delayMs, params.enabled]);

  return {
    visible,
    reveal
  };
}
