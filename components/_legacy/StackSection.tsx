import { Reveal } from "@/components/Reveal";
import styles from "@/styles/stack-section.module.css";

const items = [
  {
    short: "GC",
    name: "Google Cloud",
    body: "Base estable para desplegar con continuidad, mantener costes legibles y evitar complejidad innecesaria.",
  },
  {
    short: "NV",
    name: "NVIDIA",
    body: "Capacidad de cómputo donde el modelo exige precisión, velocidad sostenida y una operación bien medida.",
  },
  {
    short: "OA",
    name: "OpenAI",
    body: "Modelos integrados como herramienta de trabajo y decisión, no como una capa de demostración.",
  },
  {
    short: "CL",
    name: "Claude",
    body: "Soporte sólido para análisis, síntesis y tareas donde el contexto largo importa de verdad.",
  },
];

export function StackSection() {
  return (
    <section className={styles.section} id="infraestructura">
      <div className={styles.inner}>
        <div className={styles.heading}>
          <Reveal>
            <p className={styles.label}>03 — Infraestructura</p>
          </Reveal>
          <Reveal as="h2" delay={80}>
            Cómo operamos para que el sistema transmita control desde el primer
            día.
          </Reveal>
        </div>

        <div className={styles.grid}>
          {items.map((item, index) => (
            <Reveal
              as="article"
              key={item.name}
              className={styles.item}
              delay={index * 80}
            >
              <div className={styles.dot}>{item.short}</div>
              <div>
                <h3>{item.name}</h3>
                <p>{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
