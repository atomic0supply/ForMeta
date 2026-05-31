import styles from "@/styles/landing.module.css";

/**
 * Bloque de logos de empresas colaboradoras / clientes en la landing.
 * Mientras no hay imágenes finales, cada celda muestra un placeholder
 * con su slot, tipo, dimensión sugerida y tratamiento. Sustituir cada
 * <div className={styles.colSlot}> por la pieza definitiva sin alterar
 * el layout — los slots ya están dimensionados.
 */
const SLOTS: Array<{
  slot: string;
  kind: "logo" | "logo-wide" | "logo-mark";
  size: string;
  caption: string;
  hint: string;
}> = [
  {
    slot: "LOGO 01",
    kind: "logo-wide",
    size: "480×160 px · @2× · SVG preferido",
    caption: "Cliente · hostelería",
    hint: "Marca panadería · b&n + un acento",
  },
  {
    slot: "LOGO 02",
    kind: "logo-wide",
    size: "480×160 px · @2× · SVG preferido",
    caption: "Cliente · alquiler vacacional",
    hint: "Property manager · Pollença",
  },
  {
    slot: "LOGO 03",
    kind: "logo",
    size: "320×160 px · @2× · SVG",
    caption: "Cliente · taller mecánico",
    hint: "Marca con isotipo + texto",
  },
  {
    slot: "LOGO 04",
    kind: "logo",
    size: "320×160 px · @2× · SVG",
    caption: "Cliente · gestoría",
    hint: "Identidad corporativa sobria",
  },
  {
    slot: "LOGO 05",
    kind: "logo-wide",
    size: "480×160 px · @2× · SVG preferido",
    caption: "Partner tecnológico · cloud",
    hint: "Google Cloud / AWS / Anthropic",
  },
  {
    slot: "LOGO 06",
    kind: "logo",
    size: "320×160 px · @2× · SVG",
    caption: "Cliente · bodega",
    hint: "Marca enoturismo · Binissalem",
  },
  {
    slot: "LOGO 07",
    kind: "logo-mark",
    size: "200×200 px · @2× · SVG",
    caption: "Cliente · distribuidora",
    hint: "Solo isotipo · cuadrado",
  },
  {
    slot: "LOGO 08",
    kind: "logo-wide",
    size: "480×160 px · @2× · SVG preferido",
    caption: "Partner · firma digital",
    hint: "Proveedor eIDAS",
  },
];

const KIND_LABEL: Record<(typeof SLOTS)[number]["kind"], string> = {
  "logo": "logo · estándar",
  "logo-wide": "logo · horizontal",
  "logo-mark": "isotipo",
};

const KIND_CLASS: Record<(typeof SLOTS)[number]["kind"], string> = {
  "logo": styles.colSlotStd,
  "logo-wide": styles.colSlotWide,
  "logo-mark": styles.colSlotMark,
};

export function ColaboradoresSection() {
  return (
    <section className={`${styles.section} ${styles.colaboradores}`} id="colaboradores">
      <div className={styles.colaboradoresInner}>
        <div className={styles.sectionTag}>07 · con quién</div>
        <div className={styles.colaboradoresHead}>
          <h2 className={styles.reveal}>
            Empresas que <em>ya confían</em> en ForMeta.
          </h2>
          <p className={`${styles.colaboradoresLead} ${styles.reveal}`}>
            Clientes en producción y partners tecnológicos. Cada hueco está
            reservado para su logotipo — entrega un SVG y lo dejamos colocado.
          </p>
        </div>

        <div className={styles.colaboradoresGrid}>
          {SLOTS.map((s) => (
            <figure
              key={s.slot}
              className={`${styles.colSlot} ${KIND_CLASS[s.kind]}`}
              data-kind={s.kind}
              aria-label={`Placeholder logo: ${s.caption}`}
            >
              <span className={`${styles.colCorner} ${styles.colCornerTl}`} aria-hidden="true" />
              <span className={`${styles.colCorner} ${styles.colCornerTr}`} aria-hidden="true" />
              <span className={`${styles.colCorner} ${styles.colCornerBl}`} aria-hidden="true" />
              <span className={`${styles.colCorner} ${styles.colCornerBr}`} aria-hidden="true" />

              <div className={styles.colSlotHead}>
                <span className={styles.colSlotDot} aria-hidden="true" />
                <span>{s.slot}</span>
                <span className={styles.colSlotSep}>·</span>
                <span>{KIND_LABEL[s.kind]}</span>
              </div>

              <div className={styles.colSlotBody}>
                <div className={styles.colSlotCaption}>{s.caption}</div>
                <div className={styles.colSlotHint}>{s.hint}</div>
              </div>

              <figcaption className={styles.colSlotFoot}>
                <span>
                  <em>{s.size}</em>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className={styles.colaboradoresFoot}>
          <span>
            <b>10</b> empresas en producción
          </span>
          <span>
            <b>3</b> partners tecnológicos
          </span>
          <span>
            v1.0 · <b>2026</b>
          </span>
        </div>
      </div>
    </section>
  );
}
