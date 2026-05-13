import { Reveal } from "@/components/Reveal";
import styles from "@/styles/hero-manifesto.module.css";

export function HeroManifesto() {
  return (
    <div className={styles.hero}>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>
          <span className={styles.eyebrowDots} aria-hidden="true">
            <i /><i /><i />
          </span>
          Mallorca · Software a medida · AI aplicada
        </p>
        <h1>
          Software con <em>forma</em>
          <br />propia para
          <br />operaciones reales.
        </h1>
        <p className={styles.copy}>
          Diseñamos sistemas digitales para empresas que necesitan claridad
          operativa, integración real y una herramienta hecha para su manera de
          trabajar, no para una media de mercado.
        </p>
      </div>

      <Reveal className={styles.actions} delay={320}>
        <a href="#contacto" className={styles.primary}>
          <span className={styles.primaryDot} aria-hidden="true" />
          <span className={styles.primaryLabel}>Explicar vuestro caso</span>
        </a>
        <span className={styles.meta}>Software, estructura e IA sin ruido</span>
      </Reveal>
    </div>
  );
}
