"use client";

import { useEffect } from "react";

/**
 * Para cualquier elemento con `data-count` dentro del root selector,
 * cuando entra al viewport, anima un contador desde `data-start` (def 0)
 * hasta `data-value` con `data-duration` ms y `data-decimals` decimales.
 */
export function useAnimatedCounter(rootSelector: string, threshold = 0.3) {
  useEffect(() => {
    const root = document.querySelector(rootSelector);
    if (!root) return;
    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-count]"));
    if (targets.length === 0) return;

    function animate(el: HTMLElement) {
      const target = parseFloat(el.dataset.value || "0");
      const decimals = parseInt(el.dataset.decimals || "0", 10);
      const duration = parseInt(el.dataset.duration || "1400", 10);
      const start = parseFloat(el.dataset.start || "0");
      const t0 = performance.now();
      function step(now: number) {
        const t = Math.min(1, (now - t0) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const v = start + (target - start) * eased;
        el.textContent = v.toFixed(decimals);
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !(e.target as HTMLElement).dataset.counted) {
            (e.target as HTMLElement).dataset.counted = "1";
            animate(e.target as HTMLElement);
            io.unobserve(e.target);
          }
        });
      },
      { threshold },
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rootSelector, threshold]);
}
