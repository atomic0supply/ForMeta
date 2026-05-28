import styles from "@/styles/landing.module.css";

const STEPS = [
  {
    n: "01",
    title: "Entender",
    body:
      "Pasamos tiempo dentro de tu empresa. Vemos cómo trabaja la gente, qué les quita tiempo, qué les impide hacer bien su trabajo. Antes de programar nada.",
    time: "~ 2 semanas · presencial",
  },
  {
    n: "02",
    title: "Formitar",
    body:
      "Construimos exactamente lo que necesitas — ni más, ni menos. Sobre infraestructura seria (Google Cloud, OpenAI, Anthropic). Iteramos en vivo, contigo.",
    time: "~ 6–12 semanas · iterativo",
  },
  {
    n: "03",
    title: "Liberar",
    body:
      "La herramienta no se nota. Libera tiempo para que el panadero aprenda un pan nuevo, para que el gestor piense, para que el técnico resuelva problemas reales.",
    time: "en producción · soporte continuo",
  },
];

export function ProcesoSection() {
  return (
    <section className={`${styles.section} ${styles.proceso}`} id="proceso">
      <div className={styles.procesoInner}>
        <div className={styles.sectionTag}>04 · cómo trabajamos</div>
        <h2
          className={styles.reveal}
          dangerouslySetInnerHTML={{
            __html:
              "Tres pasos. Una <em>conversación</em><br>que se convierte en software.",
          }}
        />
        <div className={styles.procesoSteps}>
          {STEPS.map((step) => (
            <div key={step.n} className={`${styles.procesoStep} ${styles.reveal}`}>
              <div className={styles.stepnum}>{step.n}</div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
              <div className={styles.stepTime}>{step.time}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
