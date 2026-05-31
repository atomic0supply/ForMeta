import styles from "@/styles/landing.module.css";

import { ContactoForm } from "./ContactoForm";

export function ContactoSection() {
  return (
    <section className={`${styles.section} ${styles.contacto}`} id="contacto">
      <div className={styles.contactoInner}>
        <div>
          <div className={styles.sectionTag}>08 · conversación</div>
          <h2
            className={styles.reveal}
            dangerouslySetInnerHTML={{
              __html: "Cuéntanos qué <em>no funciona</em>. Empezamos por ahí.",
            }}
          />
          <p className={`${styles.lead} ${styles.reveal}`}>
            Sin formularios de 14 campos. Una conversación de 30 minutos. Si encaja,
            encaja. Si no, también es información.
          </p>
          <div className={styles.contactoMeta}>
            <span>
              <b>·</b> Respondemos en &lt; 24h
            </span>
            <span>
              <b>·</b> Visita Mallorca · café incluido
            </span>
            <span>
              <b>·</b> Cliente nº 11 · plaza disponible Q3 2026
            </span>
          </div>
          <div className={styles.contactoCard} style={{ marginTop: "2rem" }}>
            <div className={styles.row}>
              <span>email</span>
              <span>hola@formeta.es</span>
            </div>
            <div className={styles.row}>
              <span>signal</span>
              <span>+34 6 · solicitar</span>
            </div>
            <div className={styles.row}>
              <span>github</span>
              <span>@atomic0supply</span>
            </div>
            <div className={styles.row}>
              <span>coords</span>
              <span>39.5696° N, 2.6502° E</span>
            </div>
            <div className={styles.row}>
              <span>v</span>
              <span>1.0 · 2026.05.27</span>
            </div>
          </div>
        </div>
        <div>
          <ContactoForm />
        </div>
      </div>
    </section>
  );
}
