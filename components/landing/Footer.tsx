import styles from "@/styles/landing.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <span>
          <b>For</b>Meta · v1.0 · 2026.05.27
        </span>
        <span>
          Mallorca <span className={styles.footerSep}>·</span> 39.5696° N
        </span>
        <span>
          FMTA—LANDING <span className={styles.footerSep}>·</span> hecho con menos
        </span>
      </div>
    </footer>
  );
}
