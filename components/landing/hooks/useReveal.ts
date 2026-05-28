"use client";

import { useEffect } from "react";

/**
 * Atacha un IntersectionObserver a los elementos `.reveal` (selector real, no scoped).
 * Cuando entran al viewport, les añade la clase `in` (también no scoped).
 *
 * Para usarlo desde CSS Modules, los elementos deben tener BOTH:
 *  - el className de tu módulo (s.reveal)
 *  - una clase global "reveal" (vía :global())
 * — o bien pasar selectores propios.
 *
 * Para simplificar el port: el componente padre añade `data-reveal=""` al
 * elemento y el CSS se enlaza al data attribute en lugar de a la clase.
 * Pero el HTML original usaba `.reveal` y `.reveal.in`. Para preservar
 * la cascada del módulo sin global hackery, exponemos `addInClass` que
 * añade la clase del módulo pasada como argumento.
 */
export function useReveal(
  rootSelector: string,
  revealClass: string,
  inClass: string,
  threshold = 0.15,
) {
  useEffect(() => {
    const root = document.querySelector(rootSelector);
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>(`.${revealClass}`));
    if (els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add(inClass);
            io.unobserve(e.target);
          }
        });
      },
      { threshold },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rootSelector, revealClass, inClass, threshold]);
}
