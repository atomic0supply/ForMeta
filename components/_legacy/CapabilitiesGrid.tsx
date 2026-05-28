import { Reveal } from "@/components/Reveal";
import styles from "@/styles/capabilities-grid.module.css";

const items = [
  {
    index: "001",
    title: "Software a medida",
    body: "Cuando el proceso ya no cabe en una herramienta estándar, diseñamos una aplicación propia que reduce pasos, errores y dependencia de atajos.",
  },
  {
    index: "002",
    title: "Integración con AI",
    body: "Si el equipo ya acumula contexto, documentos o decisiones repetidas, conectamos modelos al flujo real para asistir con criterio y utilidad operativa.",
  },
  {
    index: "003",
    title: "IApps AI-first",
    body: "Cuando la inteligencia debe formar parte de la lógica central, diseñamos productos donde el modelo organiza la experiencia y no se añade al final.",
  },
];

export function CapabilitiesGrid() {
  return (
    <section className={styles.section} id="servicios">
      <div className={styles.heading}>
        <Reveal>
          <p className={styles.label}>02 — Servicios</p>
        </Reveal>
        <Reveal as="h2" delay={80}>
          Qué resolvemos cuando una herramienta genérica ya no basta.
        </Reveal>
      </div>

      <div className={styles.grid}>
        {items.map((item, index) => (
          <Reveal
            as="article"
            key={item.index}
            className={styles.card}
            delay={index * 90}
          >
            <span className={styles.index}>{item.index}</span>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
