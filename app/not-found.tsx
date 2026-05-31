import type { Metadata } from "next";
import Link from "next/link";

import { AmbientBackdrop } from "@/components/landing/AmbientBackdrop";
import { FluidBackdrop } from "@/components/landing/FluidBackdrop";
import { Footer } from "@/components/landing/Footer";
import { HudChrome } from "@/components/landing/HudChrome";
import { SkipLink } from "@/components/landing/SkipLink";
import styles from "@/styles/landing.module.css";

export const metadata: Metadata = {
  title: "404 — no encontrado · ForMeta",
  description: "La página que buscabas no está aquí.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className={styles.root}>
      <SkipLink />
      <FluidBackdrop />
      <AmbientBackdrop />
      <HudChrome />

      <main id="main" tabIndex={-1} className={styles.notFoundMain}>
        <div className={styles.notFoundInner}>
          <div className={styles.sectionTag}>404 · página no encontrada</div>
          <h1 className={styles.notFoundTitle}>
            Lo que buscabas <em>no está aquí</em>.
          </h1>
          <p className={styles.notFoundLead}>
            Quizá movimos algo de sitio. Quizá nunca existió. Quizá la URL tenía un
            dedazo. En cualquier caso, volvamos a empezar.
          </p>
          <div className={styles.notFoundActions}>
            <Link href="/" className={`${styles.btn} ${styles.btnTerra}`}>
              <span>Volver al inicio</span>
              <span className={styles.btnArrow}>→</span>
            </Link>
            <Link href="/#productos" className={`${styles.btn} ${styles.btnOutline}`}>
              <span>Ver productos</span>
              <span className={styles.btnArrow}>↓</span>
            </Link>
          </div>
          <div className={styles.notFoundMeta}>
            <span>
              <b>FMTA</b> · ERROR—404
            </span>
            <span>2026.05.27</span>
            <span>Mallorca · 39.5696° N</span>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
