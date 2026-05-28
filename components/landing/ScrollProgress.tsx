import styles from "@/styles/landing.module.css";

export function ScrollProgress() {
  return (
    <div className={styles.scrollProgress} aria-hidden="true">
      <div className={styles.bar} id="sp-bar" />
    </div>
  );
}
