import styles from "@/styles/dot-divider.module.css";

type DotDividerProps = {
  accent?: "terracotta" | "sage" | "sea" | "none";
  width?: "sm" | "md" | "lg";
};

const DOT_COUNT = 48;

export function DotDivider({
  accent = "terracotta",
  width = "md",
}: DotDividerProps) {
  return (
    <div className={styles.wrap} data-width={width} aria-hidden="true">
      <div className={styles.row}>
        {Array.from({ length: DOT_COUNT }).map((_, i) => {
          const isAccent = accent !== "none" && (i + 1) % 8 === 0;
          return (
            <span
              key={i}
              className={`${styles.dot} ${isAccent ? styles[`accent-${accent}`] : ""}`}
            />
          );
        })}
      </div>
    </div>
  );
}
