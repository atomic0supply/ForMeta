"use client";

import { useEffect } from "react";

import styles from "@/styles/landing.module.css";

import { useAnimatedCounter } from "./hooks/useAnimatedCounter";
import { useHudDarkMode } from "./hooks/useHudDarkMode";
import { useMagnetic } from "./hooks/useMagnetic";
import { useReveal } from "./hooks/useReveal";
import { useScrollProgress } from "./hooks/useScrollProgress";
import { useSectionCounter } from "./hooks/useSectionCounter";
import { useTilt3D } from "./hooks/useTilt3D";
import { useWordReveal } from "./hooks/useWordReveal";

const DARK_SECTIONS = ["manifiesto", "contacto"];
const WR_TARGETS = [
  `.${styles.manifiestoClaim}`,
  `.${styles.iapp} h2`,
  `.${styles.proceso} h2`,
  `.${styles.stack} h2`,
  `.${styles.productos} h2`,
  `.${styles.contacto} h2`,
];

const ROOT_SELECTOR = `.${styles.root}`;

export function LandingEffects() {
  // Generic reveal observers
  useReveal(ROOT_SELECTOR, styles.reveal, styles.in);

  // Word-by-word reveal in h2s
  useWordReveal(ROOT_SELECTOR, WR_TARGETS, styles.wordReveal, styles.wrWord, styles.in);

  // Magnetic CTAs (only — product cards van con tilt 3D ahora)
  useMagnetic(ROOT_SELECTOR, ".magnetic", 0.22, 90, false);

  // Tilt 3D en cards interiores (no chocan con magnetic — useTilt3D
  // skipea elementos con .magnetic)
  useTilt3D(ROOT_SELECTOR, `.${styles.iappCard}`, 6);
  useTilt3D(ROOT_SELECTOR, `.${styles.procesoStep}`, 5);

  // Scroll progress bar
  useScrollProgress("sp-bar");

  // Section counter scrollspy
  useSectionCounter(
    "section-counter",
    styles.scRow,
    styles.active,
    styles.dark,
    DARK_SECTIONS,
  );

  // HUD dark mode
  useHudDarkMode("hud", styles.dark, DARK_SECTIONS);

  // Animated counters for any [data-count] elements
  useAnimatedCounter(ROOT_SELECTOR);

  // Ensure body has no overflow-x and that smooth scroll works
  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
  }, []);

  return null;
}
