"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Anima um número de 0 até `target` com easing exponencial.
 * Retorna 0 imediatamente enquanto `target` ainda é 0.
 */
export function useCountUp(target: number, delay = 0, duration = 1100): number {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    if (target === 0) return;

    let start: number | null = null;
    let timeout: ReturnType<typeof setTimeout>;

    function animate(ts: number) {
      if (!start) start = ts;
      const elapsed = ts - start;
      // easeOutExpo
      const progress = elapsed >= duration
        ? 1
        : 1 - Math.pow(2, (-10 * elapsed) / duration);
      setValue(Math.round(progress * target));
      if (elapsed < duration) {
        raf.current = requestAnimationFrame(animate);
      } else {
        setValue(target);
      }
    }

    timeout = setTimeout(() => {
      raf.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(raf.current);
    };
  }, [target, delay, duration]);

  return value;
}
