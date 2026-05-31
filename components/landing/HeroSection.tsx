import { IconArrowDown, IconArrowRight } from "@/components/icons";
import styles from "@/styles/landing.module.css";

import { GotaMesh } from "./GotaMesh";
import { HeroWordmark } from "./HeroWordmark";

export function HeroSection() {
  return (
    <section className={`${styles.section} ${styles.hero}`} id="hero">
      <GotaMesh className={styles.gotaMesh} />
      <div className={styles.heroTopStrip}>
        <div className={styles.htsCell}>
          <span className={styles.htsKey}>{"// studio"}</span>
          <span className={styles.htsVal}>IApp · Mallorca</span>
        </div>
        <div className={`${styles.htsCell} ${styles.htsLive}`}>
          <span className={styles.htsVal}>en producción · v1.0 · 2026</span>
        </div>
      </div>

      <div className={styles.heroCenter}>
        <h1 className="visually-hidden" style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}>
          ForMeta
        </h1>
        <HeroWordmark />

        <p className={styles.heroTag}>
          Software <em>formado</em> a la medida de tu empresa, no al revés.
        </p>

        <div className={styles.heroActions}>
          <a
            href="#productos"
            className={`${styles.btn} ${styles.btnTerra} magnetic`}
            data-cursor="ver"
          >
            <span>Ver productos</span>
            <span className={styles.btnArrow}>
              <IconArrowRight size={16} />
            </span>
          </a>
          <a
            href="#manifiesto"
            className={`${styles.btn} ${styles.btnOutline} magnetic`}
            data-cursor="leer"
          >
            <span>Leer manifiesto</span>
            <span className={styles.btnArrow}>
              <IconArrowDown size={16} />
            </span>
          </a>
        </div>
      </div>

      <div className={styles.heroBottom}>
        <div className={styles.heroSpecs}>
          <div className={styles.spec}>
            <span>{"// principio"}</span>
            <b>hacer menos para hacer más</b>
          </div>
          <div className={styles.spec}>
            <span>{"// stack"}</span>
            <b className={styles.accent}>AI-first</b>
          </div>
          <div className={styles.spec}>
            <span>{"// clientes"}</span>
            <b>10 — nombres conocidos</b>
          </div>
          <div className={styles.spec}>
            <span>{"// próximo"}</span>
            <b className={styles.accent}>cliente nº 11 · Q3 2026</b>
          </div>
        </div>
        <div className={styles.heroScrollCue}>
          <span>scroll · manifiesto</span>
          <span className={styles.cueLine} />
        </div>
      </div>
    </section>
  );
}
