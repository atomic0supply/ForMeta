import styles from "@/styles/landing.module.css";

/**
 * Cita editorial. Una sola, sin foto. Canela italic grande, atribución
 * en mono con "// caso 01 · panadería · manacor". Sirve como respiro
 * entre stack y productos, y como prueba social mínima.
 */
export function QuoteSection() {
  return (
    <section className={`${styles.section} ${styles.quote}`} id="quote">
      <div className={styles.quoteInner}>
        <div className={styles.quoteEyebrow}>
          <span className={styles.quoteEyebrowLine} />
          <span>{"// caso 01 · panadería · manacor"}</span>
        </div>
        <blockquote className={`${styles.quoteText} ${styles.reveal}`}>
          <span aria-hidden="true" className={styles.quoteMark}>“</span>
          Ya no miro el stock por las mañanas. Cuando llego, el pedido al
          proveedor ya está enviado y yo decido si me pongo a probar un
          pan nuevo o si me tomo un café <em>tranquilo</em>.
        </blockquote>
        <div className={styles.quoteAttr}>
          <span className={styles.quoteName}>Joana</span>
          <span className={styles.quoteSep}>·</span>
          <span className={styles.quoteRole}>encargada · 4 tiendas</span>
        </div>
      </div>
    </section>
  );
}
