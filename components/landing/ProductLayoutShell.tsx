"use client";

import Link from "next/link";

import styles from "@/styles/productos.module.css";

import { CustomCursor } from "./CustomCursor";
import { FluidBackdrop } from "./FluidBackdrop";
import { SkipLink } from "./SkipLink";
import { useAnimatedCounter } from "./hooks/useAnimatedCounter";
import { useMagnetic } from "./hooks/useMagnetic";
import { useReveal } from "./hooks/useReveal";
import { useScrollProgress } from "./hooks/useScrollProgress";
import { useTilt3D } from "./hooks/useTilt3D";
import { useWordReveal } from "./hooks/useWordReveal";

const ROOT_SELECTOR = `.${styles.root}`;

const WR_TARGETS = [
  `.${styles.prodHero} h1`,
  `.${styles.darkSlab} h2`,
  `.${styles.sol} h2`,
  `.${styles.metrics} h2`,
  `.${styles.cases} h2`,
  `.${styles.cta} h2`,
];

type ProductHudProps = {
  code: string; // e.g. "FMTA—AXON"
};

export function ProductHud({ code }: ProductHudProps) {
  return (
    <div className={styles.hud}>
      <span className={`${styles.hudCorner} ${styles.tl}`} />
      <span className={`${styles.hudCorner} ${styles.tr}`} />
      <span className={`${styles.hudCorner} ${styles.bl}`} />
      <span className={`${styles.hudCorner} ${styles.br}`} />
      <div className={styles.hudTop}>
        <div className={styles.hudCluster}>
          <Link className={styles.hudBack} href="/">
            <span>ForMeta</span>
          </Link>
          <span className={styles.hudSep}>·</span>
          <span className={styles.hudMark}>
            <b>FMTA</b>—{code}
          </span>
        </div>
        <div className={styles.hudCluster}>
          <span>v1.0 · 2026.05.27</span>
          <span className={styles.hudSep}>·</span>
          <span>Mallorca</span>
        </div>
      </div>
    </div>
  );
}

export function ProductFooter({ code, clients }: { code: string; clients: string }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <span>
          <b>For</b>Meta · v1.0 · 2026.05.27
        </span>
        <span>
          FMTA—{code} <span className={styles.footerSep}>·</span> {clients}
        </span>
        <span>
          Mallorca <span className={styles.footerSep}>·</span> 39.5696° N
        </span>
      </div>
    </footer>
  );
}

export function ProductEffects() {
  useReveal(ROOT_SELECTOR, styles.reveal, styles.in);
  useWordReveal(ROOT_SELECTOR, WR_TARGETS, styles.wordReveal, styles.wrWord, styles.in);
  useMagnetic(ROOT_SELECTOR, ".magnetic", 0.18, 110, false);
  useScrollProgress("sp-bar");
  useAnimatedCounter(ROOT_SELECTOR);

  // Tilt 3D en cards de solución, agentes y métricas
  useTilt3D(ROOT_SELECTOR, `.${styles.solStep}`, 5);
  useTilt3D(ROOT_SELECTOR, `.${styles.agentTile}`, 5);
  useTilt3D(ROOT_SELECTOR, `.${styles.metric}`, 4);
  useTilt3D(ROOT_SELECTOR, `.${styles.lang}`, 4);
  return null;
}

export function ProductShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.root}>
      <SkipLink />
      <FluidBackdrop />
      <div className={styles.bgGrid} aria-hidden="true" />
      <div className={styles.scrollProgress} aria-hidden="true">
        <div className={styles.bar} id="sp-bar" />
      </div>
      {children}
      <CustomCursor />
    </div>
  );
}
