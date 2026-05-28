import styles from "@/styles/landing.module.css";

export function IappSection() {
  return (
    <section className={`${styles.section} ${styles.iapp}`} id="iapp">
      <div className={styles.iappInner}>
        <div className={styles.sectionTag}>03 · concepto</div>
        <h2
          className={styles.reveal}
          dangerouslySetInnerHTML={{
            __html:
              "Una <em>IApp</em> no es una app con IA. Es una app construida desde la inteligencia.",
          }}
        />
        <div className={styles.iappCards}>
          <div className={`${styles.iappCard} ${styles.reveal}`}>
            <div className={styles.cardNum}>03A · definición</div>
            <h3>Intelligent Application</h3>
            <p>
              El software entiende el contexto, aprende del uso y toma decisiones que antes
              requerían intervención humana. El trabajador deja de ser el intermediario
              entre los datos y la acción.
            </p>
            <div className={styles.compare}>
              <div className={`${styles.col} ${styles.colOld}`}>
                <b>App tradicional</b>
                ejecuta reglas fijas<br />que alguien programó
              </div>
              <div className={`${styles.col} ${styles.colNew}`}>
                <b>IApp</b>
                entiende contexto,<br />actúa sin intervención
              </div>
            </div>
          </div>
          <div className={`${styles.iappCard} ${styles.reveal}`}>
            <div className={styles.cardNum}>03B · ejemplo</div>
            <h3>Stock que se anticipa</h3>
            <p>
              No construimos un sistema que avise cuando el stock baja de un umbral.
              Construimos un sistema que{" "}
              <em style={{ color: "var(--color-terra)", fontStyle: "italic" }}>
                entiende los patrones de consumo
              </em>{" "}
              de esa empresa específica, anticipa la necesidad antes del umbral, y actúa
              sin que nadie tenga que mirar una pantalla.
            </p>
            <div className={styles.compare}>
              <div className={`${styles.col} ${styles.colOld}`}>
                <b>Antes</b>
                40 min/día gestionando<br />pedidos manuales
              </div>
              <div className={`${styles.col} ${styles.colNew}`}>
                <b>Después</b>
                3 min/día revisando<br />decisiones del sistema
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
