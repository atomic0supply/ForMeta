"use client";

import { useEffect } from "react";

/**
 * CTAs y cards "magnéticas": siguen al cursor con un factor de strength
 * dentro de un radius. También actualizan --mx/--my para gradientes radiales.
 */
export function useMagnetic(
  rootSelector: string,
  selector: string,
  strength = 0.18,
  radius = 110,
  trackPointer = false,
) {
  useEffect(() => {
    const root = document.querySelector(rootSelector);
    if (!root) return;

    const cleanups: Array<() => void> = [];

    root.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      let raf: number | null = null;
      let tx = 0;
      let ty = 0;

      function apply() {
        raf = null;
        const cur = el.style.transform.match(/translate\(([^,]+)px, ?([^)]+)px\)/);
        const curX = cur ? parseFloat(cur[1]) : 0;
        const curY = cur ? parseFloat(cur[2]) : 0;
        const nx = curX + (tx - curX) * 0.18;
        const ny = curY + (ty - curY) * 0.18;
        el.style.transform = `translate(${nx.toFixed(2)}px, ${ny.toFixed(2)}px)`;
        if (Math.abs(nx - tx) > 0.1 || Math.abs(ny - ty) > 0.1) {
          raf = requestAnimationFrame(apply);
        }
      }

      function onMove(e: PointerEvent) {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < radius * 1.5) {
          tx = dx * strength;
          ty = dy * strength;
        } else {
          tx = 0;
          ty = 0;
        }
        if (trackPointer) {
          const mx = ((e.clientX - r.left) / r.width) * 100;
          const my = ((e.clientY - r.top) / r.height) * 100;
          el.style.setProperty("--mx", `${mx}%`);
          el.style.setProperty("--my", `${my}%`);
        }
        if (raf === null) raf = requestAnimationFrame(apply);
      }

      function onLeave() {
        tx = 0;
        ty = 0;
        if (raf === null) raf = requestAnimationFrame(apply);
      }

      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
      cleanups.push(() => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
        if (raf !== null) cancelAnimationFrame(raf);
      });
    });

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [rootSelector, selector, strength, radius, trackPointer]);
}
