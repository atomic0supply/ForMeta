import styles from "@/styles/landing.module.css";

export function HeroSection() {
  return (
    <section className={`${styles.section} ${styles.hero}`} id="hero">
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
        <h1 className={styles.heroMark} aria-label="Formeta">
          <span className={`${styles.hmPiece} ${styles.hmLeft}`}>For</span>
          <span className={`${styles.hmPiece} ${styles.hmPivot}`} aria-hidden="true">
            <span className={styles.crosshair} aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
            <span className={styles.hmAnchor} />
          </span>
          <span className={`${styles.hmPiece} ${styles.hmRight}`}>Meta</span>
        </h1>

        <p className={styles.heroTag}>
          Software <em>formado</em> a la medida de tu empresa, no al revés.
        </p>

        <div className={styles.heroActions}>
          <a
            href="#productos"
            className={`${styles.btn} ${styles.btnTerra} magnetic`}
          >
            <span>Ver productos</span>
            <span className={styles.btnArrow}>→</span>
          </a>
          <a
            href="#manifiesto"
            className={`${styles.btn} ${styles.btnOutline} magnetic`}
          >
            <span>Leer manifiesto</span>
            <span className={styles.btnArrow}>↓</span>
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
