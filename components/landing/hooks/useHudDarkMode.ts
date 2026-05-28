"use client";

import { useEffect } from "react";

/**
 * Cambia el HUD a modo oscuro cuando el midline del viewport entra en una
 * sección de fondo oscuro (manifiesto / contacto).
 */
export function useHudDarkMode(
  hudId: string,
  darkClass: string,
  darkSectionIds: string[],
) {
  useEffect(() => {
    const hud = document.getElementById(hudId);
    if (!hud) return;

    function check() {
      const winMid = window.scrollY + window.innerHeight / 2;
      let onDark = false;
      for (const id of darkSectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.offsetTop;
        const bot = top + el.offsetHeight;
        if (winMid >= top && winMid < bot) {
          onDark = true;
          break;
        }
      }
      hud!.classList.toggle(darkClass, onDark);
    }

    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    check();
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [hudId, darkClass, darkSectionIds]);
}
