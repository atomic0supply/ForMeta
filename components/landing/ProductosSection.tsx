import Link from "next/link";

import styles from "@/styles/landing.module.css";

const PRODUCTS = [
  {
    slug: "stock",
    code: "FMTA—STOCK · 01",
    name: "Stock",
    tagPrefix: "que se anticipa",
    tag: "El sistema entiende patrones de consumo y actúa antes de que llegue el umbral.",
    bullets: ["predicción por SKU", "auto-pedido", "integración con tu ERP"],
    meta1: "3 clientes activos",
    meta2: "40 → 3 min/día",
  },
  {
    slug: "voz",
    code: "FMTA—VOZ · 02",
    name: "Voz",
    tagPrefix: "que opera",
    tag: "Hablas con tu negocio en mallorquín, castellano o inglés. Las operaciones se ejecutan solas.",
    bullets: ["captura por voz", "comandos en lenguaje natural", "offline-first en taller"],
    meta1: "4 clientes activos",
    meta2: "manos libres",
  },
  {
    slug: "flow",
    code: "FMTA—FLOW · 03",
    name: "Flow",
    tagPrefix: "que entiende",
    tag: "Orquestación de procesos que aprende de tu equipo y se reconfigura sola.",
    bullets: ["agentes especializados", "excepciones inteligentes", "panel de auditoría"],
    meta1: "3 clientes activos",
    meta2: "cero formularios",
  },
];

export function ProductosSection() {
  return (
    <section className={`${styles.section} ${styles.productos}`} id="productos">
      <div className={styles.productosInner}>
        <div className={styles.sectionTag}>06 · productos</div>
        <div className={styles.productosHead}>
          <h2 className={styles.reveal}>
            Tres IApps construidas <em>desde cero</em> para empresas reales.
          </h2>
          <div className={styles.headMeta}>
            <div>
              <b>3</b> productos activos
            </div>
            <div>
              <b>10</b> empresas en producción
            </div>
            <div>
              v1.0 · <b>2026</b>
            </div>
          </div>
        </div>

        <div className={styles.productosGrid}>
          {PRODUCTS.map((p) => (
            <Link
              key={p.slug}
              href={`/productos/${p.slug}`}
              className={`${styles.productoCard} magnetic`}
              data-prod={p.slug}
            >
              <div className={styles.pcNum}>
                <span>{p.code}</span>
                <span className={styles.pcArrow}>↗</span>
              </div>
              <div className={styles.pcName}>
                <em>{p.name}</em> {p.tagPrefix}
              </div>
              <div className={styles.pcTag}>{p.tag}</div>
              <div className={styles.pcBullets}>
                {p.bullets.map((b) => (
                  <span key={b}>{b}</span>
                ))}
              </div>
              <div className={styles.pcMeta}>
                <span>{p.meta1}</span>
                <span>
                  <b>{p.meta2}</b>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
