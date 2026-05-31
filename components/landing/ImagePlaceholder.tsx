import styles from "@/styles/productos.module.css";

type ImagePlaceholderProps = {
  /** Slot identifier shown as caption ("ASSET 01", "MOCKUP 03") */
  slot: string;
  /** Short caption — what this image will be */
  caption: string;
  /** Suggested aspect ratio for layout reservation (e.g. "16/9", "4/3", "1/1") */
  ratio?: string;
  /** Suggested final pixel dimensions, shown to the designer */
  size: string;
  /** Optional brief format / treatment hint */
  hint?: string;
  /** Optional kind for visual variant: screenshot / mockup / photo / loop */
  kind?: "screenshot" | "mockup" | "photo" | "loop" | "diagram";
  /** Optional extra className for the wrapper */
  className?: string;
};

const KIND_LABEL: Record<NonNullable<ImagePlaceholderProps["kind"]>, string> = {
  screenshot: "screenshot · ui",
  mockup: "mockup · device",
  photo: "foto · ambiente",
  loop: "video loop",
  diagram: "diagrama",
};

/**
 * Placeholder editorial para imágenes y capturas pendientes.
 * Reserva el espacio con el aspect ratio correcto e indica el tamaño
 * sugerido, formato y tratamiento — para que el diseñador pueda
 * sustituir el bloque por la pieza definitiva sin recolocar layout.
 */
export function ImagePlaceholder({
  slot,
  caption,
  ratio = "16/9",
  size,
  hint,
  kind = "screenshot",
  className,
}: ImagePlaceholderProps) {
  return (
    <figure
      className={`${styles.imgPh} ${className ?? ""}`}
      style={{ aspectRatio: ratio }}
      data-kind={kind}
      aria-label={`Placeholder: ${caption}`}
    >
      <span className={`${styles.imgPhCorner} ${styles.imgPhTl}`} aria-hidden="true" />
      <span className={`${styles.imgPhCorner} ${styles.imgPhTr}`} aria-hidden="true" />
      <span className={`${styles.imgPhCorner} ${styles.imgPhBl}`} aria-hidden="true" />
      <span className={`${styles.imgPhCorner} ${styles.imgPhBr}`} aria-hidden="true" />

      <div className={styles.imgPhSlot}>
        <span className={styles.imgPhSlotDot} aria-hidden="true" />
        <span>{slot}</span>
        <span className={styles.imgPhSep}>·</span>
        <span>{KIND_LABEL[kind]}</span>
      </div>

      <div className={styles.imgPhBody}>
        <div className={styles.imgPhCaption}>{caption}</div>
        {hint ? <div className={styles.imgPhHint}>{hint}</div> : null}
      </div>

      <figcaption className={styles.imgPhFoot}>
        <span>
          <em>{size}</em>
        </span>
        <span className={styles.imgPhSep}>·</span>
        <span>ratio {ratio}</span>
      </figcaption>
    </figure>
  );
}
