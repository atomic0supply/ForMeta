import { Reveal } from "@/components/Reveal";
import styles from "@/styles/contact-block.module.css";

export function ContactBlock() {
  return (
    <section className={styles.section} id="contacto">
      <div>
        <Reveal>
          <p className={styles.label}>05 — Contacto</p>
        </Reveal>
        <Reveal as="h2" delay={80}>
          Hablamos
          <br />
          de <em>forma</em>.
        </Reveal>
      </div>
      <Reveal className={styles.panel} delay={160}>
        <p>
          Si el proyecto ya pide una herramienta propia, una integración más
          seria o una capa de inteligencia útil, el siguiente paso es una
          conversación directa. Sin funnel, sin demo automática y sin una capa
          comercial entre el problema y la decisión.
        </p>
        <div className={styles.closing}>
          <p className={styles.note}>
            Escribe con algo de contexto: qué operación queréis ordenar, dónde
            está hoy la fricción y qué tendría que mejorar para que el cambio
            merezca la pena.
          </p>
          <div className={styles.contactRow}>
            <span className={styles.contactLabel}>Contacto directo</span>
            <a href="mailto:hola@formeta.es" className={styles.link}>
              hola@formeta.es
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
