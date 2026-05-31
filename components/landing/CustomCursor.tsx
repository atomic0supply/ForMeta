"use client";

import { useEffect, useRef, useState } from "react";

import styles from "@/styles/landing.module.css";

/**
 * Cursor custom sobrio: dot terra de 8px que sigue al cursor.
 * Al hover sobre elementos con `[data-cursor]` o `a/button` se expande
 * a un círculo de 36px (con label opcional desde data-cursor).
 *
 * Desactivado en dispositivos coarse (touch) — se mantiene cursor nativo.
 */

type State = "default" | "interactive" | "hidden";

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [label, setLabel] = useState<string>("");
  const [state, setState] = useState<State>("default");

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    setEnabled(true);

    let raf: number | null = null;
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let dx = mx;
    let dy = my;
    let rx = mx;
    let ry = my;

    function tick() {
      // dot follows pointer instantly
      dx = mx;
      dy = my;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${dx - 4}px, ${dy - 4}px)`;
      }
      // ring lerps (more "weighty")
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${rx - 18}px, ${ry - 18}px)`;
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    function onMove(e: PointerEvent) {
      mx = e.clientX;
      my = e.clientY;
    }
    function onLeaveWindow() {
      setState("hidden");
    }
    function onEnterWindow() {
      setState("default");
    }

    function findInteractive(target: EventTarget | null): HTMLElement | null {
      let el = target as HTMLElement | null;
      while (el) {
        if (el.matches?.("a, button, [data-cursor], [role='button'], input, textarea, select"))
          return el;
        el = el.parentElement;
      }
      return null;
    }

    function onOver(e: PointerEvent) {
      const it = findInteractive(e.target);
      if (it) {
        const cursorAttr = it.getAttribute("data-cursor");
        if (cursorAttr === "hide") {
          setState("hidden");
          return;
        }
        setLabel(cursorAttr && cursorAttr !== "true" ? cursorAttr : "");
        setState("interactive");
      } else {
        setLabel("");
        setState("default");
      }
    }

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerover", onOver);
    window.addEventListener("pointerleave", onLeaveWindow);
    window.addEventListener("pointerenter", onEnterWindow);
    document.documentElement.classList.add(styles.cursorEnabled);

    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerleave", onLeaveWindow);
      window.removeEventListener("pointerenter", onEnterWindow);
      document.documentElement.classList.remove(styles.cursorEnabled);
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={dotRef}
        className={`${styles.cursorDot} ${state === "hidden" ? styles.cursorHidden : ""}`}
        aria-hidden="true"
      />
      <div
        ref={ringRef}
        className={`${styles.cursorRing} ${state === "interactive" ? styles.cursorRingActive : ""} ${state === "hidden" ? styles.cursorHidden : ""}`}
        aria-hidden="true"
      >
        {label ? <span className={styles.cursorLabel}>{label}</span> : null}
      </div>
    </>
  );
}
