"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "@/styles/landing-loader.module.css";

type Variant = "1" | "2" | "3" | "drop";
type Phase = "hidden" | "enter" | "leave";

const durations: Record<Variant, number> = {
  "1": 820,
  "2": 980,
  "3": 2450,
  drop: 3200,
};

const leaveLead: Record<Variant, number> = {
  "1": 220,
  "2": 220,
  "3": 420,
  drop: 420,
};

export function LandingLoader() {
  const [loaderParam, setLoaderParam] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setLoaderParam(params.get("loader"));
  }, []);

  const variant = useMemo<Variant | null>(() => {
    if (loaderParam === "off") {
      return null;
    }

    if (
      loaderParam === "1" ||
      loaderParam === "2" ||
      loaderParam === "3" ||
      loaderParam === "drop"
    ) {
      return loaderParam;
    }

    // Default home experience: cinematic drop loader.
    return "drop";
  }, [loaderParam]);

  const [phase, setPhase] = useState<Phase>("hidden");

  useEffect(() => {
    if (!variant) {
      setPhase("hidden");
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("hidden");
      return;
    }

    setPhase("enter");
    const duration = durations[variant];
    const leaveMs = Math.max(180, duration - leaveLead[variant]);
    const leaveTimer = window.setTimeout(() => setPhase("leave"), leaveMs);
    const hideTimer = window.setTimeout(() => {
      setPhase("hidden");
      window.dispatchEvent(new Event("formeta:loader-hidden"));
    }, duration);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(hideTimer);
    };
  }, [variant]);

  if (!variant || phase === "hidden") {
    return null;
  }

  return (
    <div className={styles.shell} data-state={phase} data-variant={variant}>
      <div className={styles.inner}>
        {variant === "1" && (
          <div className={styles.wordmarkWrap}>
            <p className={styles.wordmark}>
              <span>For</span>
              <em>Meta</em>
            </p>
            <div className={styles.rule} />
          </div>
        )}

        {variant === "2" && (
          <div className={styles.orbitalWrap} aria-hidden="true">
            <svg viewBox="0 0 160 160" className={styles.orbitalSvg}>
              <circle cx="80" cy="80" r="58" className={styles.orbStone} />
              <circle cx="80" cy="80" r="41" className={styles.orbTerracotta} />
              <circle cx="80" cy="80" r="25" className={styles.orbSea} />
              <line x1="80" y1="22" x2="80" y2="138" className={styles.orbAxis} />
              <line x1="22" y1="80" x2="138" y2="80" className={styles.orbAxis} />
              <circle cx="80" cy="80" r="3.5" className={styles.orbCore} />
            </svg>
          </div>
        )}

        {variant === "3" && (
          <div className={styles.monoWrap}>
            <p>booting formeta.system</p>
            <p>context layer ..... online</p>
            <p>action layer ...... online</p>
            <p>output layer ...... ready</p>
            <div className={styles.monoRule} />
          </div>
        )}

        {variant === "drop" && (
          <div className={styles.dropWrap} aria-hidden="true">
            <svg viewBox="0 0 160 200" fill="none" className={styles.dropSvg}>
              <path
                d="M80 12 C80 12 104 52 116 88 C126 118 122 152 102 168 C92 176 80 178 80 178 C80 178 68 176 58 168 C38 152 34 118 44 88 C56 52 80 12 80 12 Z"
                stroke="var(--ink)"
                strokeWidth="3.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                className={styles.dropPath}
              />
              <circle cx="80" cy="130" r="6" fill="var(--terracotta)" className={styles.dropDot} />
            </svg>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/wordmark-dots.svg"
              alt=""
              className={styles.dropWordmark}
            />
          </div>
        )}
      </div>
    </div>
  );
}
