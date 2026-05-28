"use client";

import { useEffect } from "react";

/**
 * Splittea palabras manteniendo tags HTML intactos (preserva <em>, <br>, <strong>).
 * Añade clase `wordRevealClass` al elemento padre, envuelve cada palabra en un
 * <span> con la clase `wordClass` y `--i` para el stagger.
 * Después observa cada elemento procesado y le añade `inClass` cuando entra
 * al viewport.
 */
export function useWordReveal(
  rootSelector: string,
  targetSelectors: string[],
  wordRevealClass: string,
  wordClass: string,
  inClass: string,
  threshold = 0.2,
) {
  useEffect(() => {
    const root = document.querySelector(rootSelector);
    if (!root) return;

    function splitWords(el: HTMLElement) {
      if (el.dataset.wrDone) return;
      const text = el.innerHTML;
      const tokens: Array<{ t: "tag" | "text"; v: string }> = [];
      let current = "";
      let inTag = false;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === "<") {
          if (current) {
            tokens.push({ t: "text", v: current });
            current = "";
          }
          inTag = true;
          current = "<";
        } else if (ch === ">") {
          current += ">";
          tokens.push({ t: "tag", v: current });
          current = "";
          inTag = false;
        } else {
          current += ch;
        }
      }
      if (current) tokens.push({ t: inTag ? "tag" : "text", v: current });

      let idx = 0;
      const out = tokens
        .map((tk) => {
          if (tk.t === "tag") return tk.v;
          return tk.v
            .split(/(\s+)/)
            .map((piece) => {
              if (piece === "") return "";
              if (/^\s+$/.test(piece)) return piece;
              const span = `<span class="${wordClass}" style="--i:${idx}">${piece}</span>`;
              idx++;
              return span;
            })
            .join("");
        })
        .join("");

      el.innerHTML = out;
      el.classList.add(wordRevealClass);
      el.dataset.wrDone = "1";
    }

    const targets: HTMLElement[] = [];
    targetSelectors.forEach((sel) => {
      root.querySelectorAll<HTMLElement>(sel).forEach((el) => {
        splitWords(el);
        targets.push(el);
      });
    });

    if (targets.length === 0) return;

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
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rootSelector, targetSelectors, wordRevealClass, wordClass, inClass, threshold]);
}
