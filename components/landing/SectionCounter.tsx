import styles from "@/styles/landing.module.css";

const SECTIONS = [
  { id: "hero", num: "01" },
  { id: "manifiesto", num: "02" },
  { id: "iapp", num: "03" },
  { id: "proceso", num: "04" },
  { id: "stack", num: "05" },
  { id: "productos", num: "06" },
  { id: "contacto", num: "07" },
];

export function SectionCounter() {
  return (
    <div className={styles.sectionCounter} id="section-counter" aria-hidden="true">
      {SECTIONS.map((s, i) => (
        <div
          key={s.id}
          className={`${styles.scRow} ${i === 0 ? styles.active : ""}`}
          data-sc={s.id}
        >
          <span className={styles.tick} />
          <span className={styles.num}>{s.num}</span>
        </div>
      ))}
    </div>
  );
}
