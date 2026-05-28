import styles from "@/styles/landing.module.css";

type TickerProps = {
  variant?: "dark" | "light";
  reverse?: boolean;
  items: string[];
};

export function Ticker({ variant = "dark", reverse = false, items }: TickerProps) {
  // Duplicamos los items para que el loop sea seamless (la animación traslada -50%).
  const doubled = [...items, ...items];
  return (
    <div className={`${styles.ticker} ${variant === "light" ? styles.light : ""}`} aria-hidden="true">
      <div className={`${styles.tickerTrack} ${reverse ? styles.reverse : ""}`}>
        {doubled.map((t, i) => (
          <span key={i} className={styles.tickerItem}>
            <span className={styles.glyph} />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
