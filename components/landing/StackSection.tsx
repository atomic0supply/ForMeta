import styles from "@/styles/landing.module.css";

const STACK = [
  { n: "01", name: "Google Cloud", role: "infraestructura · datos · vertex AI" },
  { n: "02", name: "Anthropic", role: "razonamiento · agentes · Claude" },
  { n: "03", name: "OpenAI", role: "multimodal · vision · whisper" },
  { n: "04", name: "NVIDIA", role: "cómputo on-premise · cuando hace falta" },
  { n: "05", name: "Supabase / Postgres", role: "datos · auth · realtime" },
  { n: "06", name: "Cloudflare", role: "edge · workers · seguridad" },
];

export function StackSection() {
  return (
    <section className={`${styles.section} ${styles.stack}`} id="stack">
      <div className={styles.stackInner}>
        <div>
          <div className={styles.sectionTag}>05 · infraestructura</div>
          <h2 className={styles.reveal}>
            Stack serio para empresas <em>locales</em>.
          </h2>
          <p className={styles.reveal}>
            No presumimos de stack con clientes. Presumimos de lo que cambia en su día a
            día. Pero por si te lo preguntas:
          </p>
        </div>
        <div className={styles.stackList}>
          {STACK.map((row) => (
            <div key={row.n} className={styles.stackRow}>
              <div className={styles.vendor}>
                <b>{row.n}</b>
                {row.name}
              </div>
              <div className={styles.role}>{row.role}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
