"use client";

import { useEffect } from "react";

/**
 * Scroll-spy: el section counter del lateral derecho marca como `active`
 * la sección cuya top esté justo por encima del 45% del viewport.
 * También activa la clase `dark` cuando la sección activa está en una
 * de las secciones oscuras (manifiesto/contacto).
 */
export function useSectionCounter(
  counterId: string,
  rowClass: string,
  activeClass: string,
  darkClass: string,
  darkSectionIds: string[],
) {
  useEffect(() => {
    const counterEl = document.getElementById(counterId);
    if (!counterEl) return;
    const rows = Array.from(counterEl.querySelectorAll<HTMLElement>(`.${rowClass}`));
    if (rows.length === 0) return;
    const sectionIds = rows.map((r) => r.dataset.sc).filter((x): x is string => Boolean(x));

    function update() {
      const mid = window.scrollY + window.innerHeight * 0.45;
      let activeIdx = 0;
      for (let i = 0; i < sectionIds.length; i++) {
        const el = document.getElementById(sectionIds[i]);
        if (!el) continue;
        if (el.offsetTop <= mid) activeIdx = i;
      }
      rows.forEach((r, i) => r.classList.toggle(activeClass, i === activeIdx));
      const onDark = darkSectionIds.includes(sectionIds[activeIdx]);
      counterEl!.classList.toggle(darkClass, onDark);
    }

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [counterId, rowClass, activeClass, darkClass, darkSectionIds]);
}
