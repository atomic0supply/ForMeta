import Link from "next/link";

import styles from "@/styles/landing.module.css";

const PRODUCTS = [
  {
    slug: "axon",
    code: "FMTA—AXON · 01",
    name: "Axon",
    tagPrefix: "el sistema nervioso",
    tag: "Agentes con IA que aprenden tu dominio, gestionan excepciones, se coordinan entre ellos y dejan traza auditable de cada decisión.",
    bullets: ["agentes multi-dominio", "excepciones inteligentes", "auditoría completa"],
    meta1: "operación 24/7",
    meta2: "decisiones trazables",
  },
  {
    slug: "lumen",
    code: "FMTA—LUMEN · 02",
    name: "Lumen",
    tagPrefix: "que ilumina la calle",
    tag: "Tótems de información y animación para hostelería y comercio físico. Presencia de marca activa, dinámica e inteligente en el espacio físico.",
    bullets: ["tótems digitales", "contenido dinámico", "marca viva"],
    meta1: "hostelería · retail",
    meta2: "espacio físico activo",
  },
  {
    slug: "core",
    code: "FMTA—CORE · 03",
    name: "Core",
    tagPrefix: "el sistema operativo",
    tag: "Wiki, tickets, inventario, tareas y ubicaciones en un solo lugar — con una IA que conecta todo y sabe el contexto antes de que se lo expliques.",
    bullets: ["wiki + tickets + inventario", "IA contextual", "un solo sistema"],
    meta1: "equipo unificado",
    meta2: "contexto en vivo",
  },
  {
    slug: "nest",
    code: "FMTA—NEST · 04",
    name: "Nest",
    tagPrefix: "gestor ↔ propietario",
    tag: "Plataforma que conecta al gestor con sus propietarios. CMS ligero, portal privado, liquidaciones automáticas y contratos digitales.",
    bullets: ["portal por propietario", "liquidaciones auto", "contratos digitales"],
    meta1: "alquiler · inmobiliarias",
    meta2: "transparencia sin fricción",
  },
  {
    slug: "field",
    code: "FMTA—FIELD · 05",
    name: "Field",
    tagPrefix: "inspecciones inteligentes",
    tag: "Formularios configurables, análisis automático de imágenes con IA e informes PDF listos para enviar. Sin papel, sin retrasos, sin errores.",
    bullets: ["IA sobre imágenes", "formularios on-site", "PDF auto"],
    meta1: "servicios en campo",
    meta2: "informe en minutos",
  },
];

export function ProductosSection() {
  return (
    <section className={`${styles.section} ${styles.productos}`} id="productos">
      <div className={styles.productosInner}>
        <div className={styles.sectionTag}>06 · productos</div>
        <div className={styles.productosHead}>
          <h2 className={styles.reveal}>
            Cinco IApps construidas <em>desde cero</em> para empresas reales.
          </h2>
          <div className={styles.headMeta}>
            <div>
              <b>5</b> productos activos
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
