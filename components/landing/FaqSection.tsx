"use client";

import { useState } from "react";

import { IconPlus } from "@/components/icons";
import styles from "@/styles/landing.module.css";

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: "¿Cuánto cuesta?",
    a: "Depende del alcance. Como referencia, un primer despliegue (entender + formitar + liberar) suele estar entre 20-60k€ según integraciones. Después, suscripción mensual modesta para soporte y entrenamiento continuo. Te damos cifra concreta en la primera conversación.",
  },
  {
    q: "¿Cuánto tarda en estar listo?",
    a: "Entre 6 y 12 semanas hasta producción en la mayoría de proyectos. Las primeras 2 semanas son presenciales — vamos a tu sitio, vemos cómo trabajáis. Después, iteramos en vivo. No hay big bang final: cada semana hay algo que ya funciona.",
  },
  {
    q: "¿Y si no funciona como esperaba?",
    a: "Lo iteramos hasta que funcione, sin coste extra hasta el primer mes en producción. Si llegado a producción la herramienta no encaja con tu día a día, la retiramos y solo cobramos el trabajo de entendimiento (proporcional). Sin letra pequeña.",
  },
  {
    q: "¿Trabajáis fuera de Mallorca?",
    a: "Sí, pero pasamos al menos las primeras 2 semanas presencialmente con tu equipo. Es no negociable. Después, el resto puede ser remoto. Hemos ido a Madrid, Barcelona, Valencia, Burgos. Si está más lejos, hablamos.",
  },
  {
    q: "¿Quién tiene los datos?",
    a: "Tú. Siempre. Tu infraestructura, tu cuenta cloud (Google, AWS o on-prem si hace falta), tus credenciales. Nosotros tenemos acceso operativo mientras dura el proyecto y el soporte. Cualquier momento puedes cortar el acceso y todo sigue funcionando.",
  },
];

export function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section className={`${styles.section} ${styles.faq}`} id="faq">
      <div className={styles.faqInner}>
        <div className={styles.sectionTag}>{"// preguntas frecuentes"}</div>
        <h2
          className={styles.reveal}
          dangerouslySetInnerHTML={{
            __html: "Lo que <em>siempre</em> nos preguntan.",
          }}
        />
        <p className={`${styles.faqLead} ${styles.reveal}`}>
          Cinco respuestas concretas. Sin letra pequeña.
        </p>

        <div className={styles.faqList}>
          {FAQS.map((item, i) => {
            const open = openIdx === i;
            return (
              <div key={i} className={`${styles.faqItem} ${open ? styles.faqItemOpen : ""}`}>
                <button
                  type="button"
                  className={styles.faqQuestion}
                  aria-expanded={open}
                  aria-controls={`faq-a-${i}`}
                  onClick={() => setOpenIdx(open ? null : i)}
                  data-cursor={open ? "cerrar" : "abrir"}
                >
                  <span className={styles.faqNum}>0{i + 1}</span>
                  <span className={styles.faqQ}>{item.q}</span>
                  <span className={styles.faqToggle} aria-hidden="true">
                    <IconPlus size={16} />
                  </span>
                </button>
                <div
                  id={`faq-a-${i}`}
                  className={styles.faqAnswerWrap}
                  role="region"
                  aria-hidden={!open}
                >
                  <p className={styles.faqAnswer}>{item.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
