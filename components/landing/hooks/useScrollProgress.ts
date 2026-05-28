"use client";

import { useEffect, useRef } from "react";

/**
 * Actualiza la altura de la barra `#sp-bar` según el % de scroll del documento.
 * También expone el progreso vía ref si se necesita.
 */
export function useScrollProgress(barId = "sp-bar") {
  const progressRef = useRef(0);

  useEffect(() => {
    const bar = document.getElementById(barId);
    if (!bar) return;

    function update() {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      const p = docH > 0 ? Math.min(1, Math.max(0, window.scrollY / docH)) : 0;
      progressRef.current = p;
      if (bar) bar.style.height = `${(p * 100).toFixed(2)}%`;
    }

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [barId]);

  return progressRef;
}
