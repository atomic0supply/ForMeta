import Link from "next/link";

import { IconArrowRight } from "@/components/icons";
import styles from "@/styles/landing.module.css";

/**
 * Teaser de contacto en la landing — la página completa con form, mapa
 * de Mallorca y detalles vive en /contacto.
 *
 * Aquí solo invitamos a hacer click. Mantiene el id "#contacto" para
 * que el section-counter y los hashes existentes sigan funcionando.
 */
export function ContactoSection() {
  return (
    <section className={`${styles.section} ${styles.contactoTeaser}`} id="contacto">
      <div className={styles.contactoTeaserInner}>
        <div className={styles.sectionTag}>08 · conversación</div>
        <h2
          className={`${styles.contactoTeaserH2} ${styles.reveal}`}
          dangerouslySetInnerHTML={{
            __html: "Cuéntanos qué <em>no funciona</em>.<br/>Empezamos por ahí.",
          }}
        />
        <p className={`${styles.contactoTeaserLead} ${styles.reveal}`}>
          30 minutos. Sin formularios de 14 campos. Si encaja, encaja.
        </p>
        <div className={styles.contactoTeaserActions}>
          <Link
            href="/contacto"
            className={`${styles.btn} ${styles.btnTerra} magnetic`}
            data-cursor="conversar"
          >
            <span>Empezar conversación</span>
            <span className={styles.btnArrow}>
              <IconArrowRight size={16} />
            </span>
          </Link>
        </div>
        <div className={styles.contactoTeaserMeta}>
          <span><b>·</b> Respondemos en &lt; 24h</span>
          <span><b>·</b> Visita al estudio · café incluido</span>
          <span><b>·</b> Mallorca · 39.5696° N</span>
        </div>
      </div>
    </section>
  );
}
