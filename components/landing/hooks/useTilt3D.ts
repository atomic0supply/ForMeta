"use client";

import { useEffect } from "react";

/**
 * Tilt 3D suave para cards. Calcula rotateX/rotateY según posición del
 * cursor en el elemento, dentro de un máximo en grados.
 * En mobile/touch (sin pointermove preciso) no se aplica.
 */
export function useTilt3D(
  rootSelector: string,
  selector: string,
  maxDeg = 6,
) {
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const root = document.querySelector(rootSelector);
    if (!root) return;

    const cleanups: Array<() => void> = [];

    root.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      // Si ya hay un transform del magnetic, no romperlo: usar wrapper o
      // simplemente concatenar transform. Para simplicidad, asumimos que
      // tilt actúa SOLO si el elemento no tiene .magnetic.
      if (el.classList.contains("magnetic")) return;

      let raf: number | null = null;
      let tRotX = 0;
      let tRotY = 0;
      let cRotX = 0;
      let cRotY = 0;

      function apply() {
        raf = null;
        cRotX += (tRotX - cRotX) * 0.12;
        cRotY += (tRotY - cRotY) * 0.12;
        el.style.transform = `perspective(900px) rotateX(${cRotX.toFixed(2)}deg) rotateY(${cRotY.toFixed(2)}deg)`;
        if (Math.abs(tRotX - cRotX) > 0.05 || Math.abs(tRotY - cRotY) > 0.05) {
          raf = requestAnimationFrame(apply);
        } else {
          if (Math.abs(cRotX) < 0.05 && Math.abs(cRotY) < 0.05) {
            el.style.transform = "";
          }
        }
      }

      function onMove(e: PointerEvent) {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width; // 0..1
        const py = (e.clientY - r.top) / r.height; // 0..1
        tRotY = (px - 0.5) * 2 * maxDeg;
        tRotX = -(py - 0.5) * 2 * maxDeg;
        if (raf === null) raf = requestAnimationFrame(apply);
      }

      function onLeave() {
        tRotX = 0;
        tRotY = 0;
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

    return () => cleanups.forEach((fn) => fn());
  }, [rootSelector, selector, maxDeg]);
}
