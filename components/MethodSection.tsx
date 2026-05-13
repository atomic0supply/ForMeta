import { Reveal } from "@/components/Reveal";
import styles from "@/styles/method-section.module.css";

export function MethodSection() {
  return (
    <section className={styles.section} id="identidad">
      <Reveal className={styles.intro}>
        <p className={styles.label}>Identidad</p>
        <div className={styles.number} aria-hidden="true">01</div>
      </Reveal>

      <div className={styles.layout}>
        <Reveal as="h2">
          Para equipos que han
          <br />
          superado el <em>parche</em>.
        </Reveal>
        <Reveal as="p" className={styles.copy} delay={120}>
          ForMeta trabaja con organizaciones que ya sienten la fricción de sus
          procesos: hojas dispersas, herramientas que no se hablan, criterios
          expertos difíciles de escalar y decisiones que dependen de demasiado
          trabajo manual. Ahí es donde una estructura propia empieza a tener
          sentido.
        </Reveal>
      </div>
    </section>
  );
}
