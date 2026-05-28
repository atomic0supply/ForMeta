import styles from "@/styles/landing.module.css";

/**
 * Backdrop iridiscente + líquido.
 * - 3 blobs grandes con gradients de la paleta iris (--iris-1..5).
 * - Animados con float/rotación/escala suaves de 28-36s.
 * - SVG feTurbulence + feDisplacementMap envuelve el conjunto y crea
 *   la distorsión líquida (la "frecuencia" oscila en el tiempo).
 * - Respeta prefers-reduced-motion: sin animación, sin distorsión,
 *   gradientes estáticos a baja opacidad.
 */
export function IridescentBackdrop() {
  return (
    <>
      <svg
        className={styles.irisDefs}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <filter id="iris-liquid" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.014"
              numOctaves="2"
              seed="7"
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                values="0.012;0.022;0.012"
                dur="24s"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="55" />
          </filter>
        </defs>
      </svg>

      <div className={styles.iris} aria-hidden="true">
        <div className={`${styles.irisBlob} ${styles.irisBlob1}`} />
        <div className={`${styles.irisBlob} ${styles.irisBlob2}`} />
        <div className={`${styles.irisBlob} ${styles.irisBlob3}`} />
      </div>
    </>
  );
}
