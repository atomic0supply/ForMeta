import styles from "@/styles/landing.module.css";

const STACK = [
  {
    n: "01",
    name: "Google Cloud",
    role: "infraestructura · datos · vertex AI",
    slot: "LOGO 01",
    size: "240×80 px · @2× · SVG",
    hint: "logotipo + isotipo",
  },
  {
    n: "02",
    name: "Anthropic",
    role: "razonamiento · agentes · Claude",
    slot: "LOGO 02",
    size: "240×80 px · @2× · SVG",
    hint: "wordmark · monocromo ok",
  },
  {
    n: "03",
    name: "OpenAI",
    role: "multimodal · vision · whisper",
    slot: "LOGO 03",
    size: "240×80 px · @2× · SVG",
    hint: "isotipo + wordmark",
  },
  {
    n: "04",
    name: "NVIDIA",
    role: "cómputo on-premise · cuando hace falta",
    slot: "LOGO 04",
    size: "240×80 px · @2× · SVG",
    hint: "wordmark verde corporativo",
  },
  {
    n: "05",
    name: "Supabase / Postgres",
    role: "datos · auth · realtime",
    slot: "LOGO 05",
    size: "240×80 px · @2× · SVG (los dos)",
    hint: "dos marcas yuxtapuestas",
  },
  {
    n: "06",
    name: "Cloudflare",
    role: "edge · workers · seguridad",
    slot: "LOGO 06",
    size: "240×80 px · @2× · SVG",
    hint: "wordmark + isotipo nube",
  },
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
              <div className={styles.stackText}>
                <div className={styles.vendor}>
                  <b>{row.n}</b>
                  {row.name}
                </div>
                <div className={styles.role}>{row.role}</div>
              </div>
              <figure
                className={styles.stackLogo}
                aria-label={`Placeholder logo: ${row.name}`}
              >
                <span className={`${styles.stackLogoCorner} ${styles.stackLogoTl}`} aria-hidden="true" />
                <span className={`${styles.stackLogoCorner} ${styles.stackLogoTr}`} aria-hidden="true" />
                <span className={`${styles.stackLogoCorner} ${styles.stackLogoBl}`} aria-hidden="true" />
                <span className={`${styles.stackLogoCorner} ${styles.stackLogoBr}`} aria-hidden="true" />
                <div className={styles.stackLogoHead}>
                  <span className={styles.stackLogoDot} aria-hidden="true" />
                  <span>{row.slot}</span>
                </div>
                <div className={styles.stackLogoBody}>
                  <span className={styles.stackLogoName}>{row.name}</span>
                  <span className={styles.stackLogoHint}>{row.hint}</span>
                </div>
                <figcaption className={styles.stackLogoFoot}>
                  <em>{row.size}</em>
                </figcaption>
              </figure>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
