"use client";

import { useState, useEffect, useRef } from "react";

interface WindowSize {
  width: number | undefined;
  height: number | undefined;
}

// Coarsened window size — the only consumers (chart margin/font helpers in
// chart-shared.ts) bucket width into <640, <1024, >=1024. We return a
// representative width for each bucket so typical resizes don't trigger
// renders at all.
function bucketWidth(w: number): number {
  if (w < 640) return 500;
  if (w < 1024) return 800;
  return 1280;
}

export function useWindowSize(): WindowSize {
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: undefined,
    height: undefined,
  });
  const tickingRef = useRef(false);

  useEffect(() => {
    const update = () => {
      tickingRef.current = false;
      const w = bucketWidth(window.innerWidth);
      const h = window.innerHeight;
      setWindowSize((prev) => {
        if (prev.width === w && prev.height === h) return prev;
        return { width: w, height: h };
      });
    };

    const onResize = () => {
      if (!tickingRef.current) {
        tickingRef.current = true;
        requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return windowSize;
}
