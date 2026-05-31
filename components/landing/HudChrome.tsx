import styles from "@/styles/landing.module.css";

import { Isotipo } from "./Isotipo";
import { MobileNav } from "./MobileNav";

export function HudChrome() {
  return (
    <div className={styles.hud} id="hud">
      <span className={`${styles.hudCorner} ${styles.tl}`} />
      <span className={`${styles.hudCorner} ${styles.tr}`} />
      <span className={`${styles.hudCorner} ${styles.bl}`} />
      <span className={`${styles.hudCorner} ${styles.br}`} />

      <div className={styles.hudTop}>
        <div className={styles.hudCluster}>
          <span className={styles.hudDot} aria-hidden="true" />
          <span className={styles.hudMark}>
            <Isotipo size={20} />
            <span>
              <b>For</b>Meta
            </span>
          </span>
          <span className={styles.hudSep}>·</span>
          <span className={styles.hudTag}>v1.0</span>
          <span className={styles.hudSep}>·</span>
          <span>
            Mallorca <span className={styles.hudVal}>39.5696° N</span>
          </span>
        </div>
        <nav className={styles.hudNav} aria-label="Principal">
          <a href="#manifiesto">Manifiesto</a>
          <a href="#iapp">IApp</a>
          <a href="#proceso">Proceso</a>
          <a href="#stack">Stack</a>
          <a href="#productos">Productos</a>
          <a href="/contacto">Contacto</a>
        </nav>
        <MobileNav />
      </div>

      <div className={styles.hudBot}>
        <div className={styles.hudCluster}>
          <span>FMTA—LANDING</span>
          <span className={styles.hudSep}>·</span>
          <span>v1.0 · 2026.05.27</span>
        </div>
        <div className={styles.hudCluster}>
          <span>
            39.5696° N <span className={styles.hudSep}>·</span> 2.6502° E
          </span>
        </div>
      </div>
    </div>
  );
}
