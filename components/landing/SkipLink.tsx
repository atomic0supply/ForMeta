import styles from "@/styles/landing.module.css";

/**
 * Skip-to-content. Invisible salvo al focus (Tab desde la primera
 * carga). Salta al `<main id="main">` evitando navegar por todo el
 * HUD/canvas con el teclado.
 */
export function SkipLink() {
  return (
    <a href="#main" className={styles.skipLink}>
      Saltar al contenido
    </a>
  );
}
