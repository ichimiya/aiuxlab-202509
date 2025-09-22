import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAppWindowLayoutStore } from "@/features/voiceRecognition/stores/appWindowLayoutStore";

const WINDOW_TRANSITION_MS = 1000;

export interface AppWindowVisibilityState {
  isHidden: boolean;
  isAnimating: boolean;
}

export function useAppWindowVisibility(): AppWindowVisibilityState {
  const dimensions = useAppWindowLayoutStore((state) => state.dimensions);
  const isTransitioning = useAppWindowLayoutStore(
    (state) => state.isTransitioning,
  );
  const [isHidden, setIsHidden] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const timerRef = useRef<number | null>(null);
  const isFirstRender = useRef(true);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => () => clearTimer(), []);

  useLayoutEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    clearTimer();

    setIsHidden(true);
    setIsAnimating(true);

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setIsAnimating(false);

      if (!useAppWindowLayoutStore.getState().isTransitioning) {
        setIsHidden(false);
      }
    }, WINDOW_TRANSITION_MS);

    return () => clearTimer();
  }, [dimensions]);

  useLayoutEffect(() => {
    if (isTransitioning) {
      setIsHidden(true);
      return;
    }

    if (!isAnimating) {
      setIsHidden(false);
    }
  }, [isTransitioning, isAnimating]);

  return { isHidden, isAnimating };
}
