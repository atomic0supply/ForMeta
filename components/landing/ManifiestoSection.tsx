import styles from "@/styles/landing.module.css";

export function ManifiestoSection() {
  return (
    <section className={`${styles.section} ${styles.manifiesto}`} id="manifiesto">
      <div className={styles.manifiestoInner}>
        <div className={styles.sectionTag}>02 · manifiesto</div>
        <div className={styles.manifiestoGrid}>
          <div className={styles.reveal}>
            <div
              className={styles.manifiestoClaim}
              dangerouslySetInnerHTML={{
                __html: "Hacer <em>menos</em><br>para poder<br><em>hacer más</em>.",
              }}
            />
          </div>
          <div className={`${styles.manifiestoBody} ${styles.reveal}`}>
            <p>
              ForMeta nace de <strong>formita</strong> — la palabra mallorquina para dar
              forma a las cosas. Cogemos el conocimiento que ya existe en una empresa, la
              forma en que trabaja su gente, y le damos una forma digital que encaja.
            </p>
            <p>
              No imponemos procesos. <em>Damos forma a los que ya funcionan.</em>
            </p>
            <p>
              Trabajamos con infraestructura de primer nivel porque lo local no tiene por
              qué ser menor. Una empresa de diez personas en un pueblo de Mallorca merece
              las mismas herramientas que una multinacional.
            </p>
            <p>
              <strong>Tenemos diez clientes. Conocemos sus nombres. Así queremos seguir.</strong>
            </p>
          </div>
        </div>
        <div className={styles.manifiestoMeta}>
          <span>
            <b>FMTA</b> · v1.0
          </span>
          <span>2026.05.27</span>
          <span>Mallorca / 39.5696° N · 2.6502° E</span>
          <span>Manifiesto · IApp · Tono</span>
        </div>
      </div>
    </section>
  );
}
