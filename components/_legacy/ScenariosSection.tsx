import { Reveal } from "@/components/Reveal";
import styles from "@/styles/scenarios-section.module.css";

const layers = [
  {
    title: "context / lectura",
    lines: ["model.perceive(userContext)", "model.reason(domainKnowledge)"],
  },
  {
    title: "action / decisión",
    lines: ["agent.plan(objective)", "agent.execute(steps)"],
  },
  {
    title: "output / entrega",
    lines: ["result.deliver(precision: max)", "loop.improve()"],
  },
];

export function ScenariosSection() {
  return (
    <section className={styles.section} id="iapps">
      <div className={styles.side}>
        <Reveal>
          <p className={styles.label}>04 — IApps</p>
        </Reveal>
        <Reveal as="h2" delay={80}>
          Cuando la inteligencia
          <br />
          organiza la interfaz.
        </Reveal>
        <Reveal as="p" className={styles.copy} delay={160}>
          Una IApp sirve para casos donde el valor no está solo en automatizar,
          sino en leer contexto, proponer acciones y devolver una respuesta útil
          dentro del flujo de trabajo. La interfaz puede verse simple porque la
          lógica ya está ordenada por debajo.
        </Reveal>
        <Reveal as="p" className={styles.bridge} delay={220}>
          Primero se define qué debe entender y decidir el sistema. Después se
          diseña la experiencia alrededor de esa capacidad.
        </Reveal>
      </div>

      <div className={styles.visual}>
        {layers.map((layer, index) => (
          <Reveal
            as="article"
            key={layer.title}
            className={styles.block}
            delay={index * 80}
          >
            <span className={styles.highlight}>{layer.title}</span>
            {layer.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </Reveal>
        ))}
      </div>
    </section>
  );
}
