import styles from "@/styles/brand-wordmark.module.css";

type Variant = "sand" | "mono" | "negative";
type Size = "sm" | "md" | "lg";

type BrandWordmarkProps = {
  variant?: Variant;
  size?: Size;
  iconOnly?: boolean;
  animated?: boolean;
  /** @deprecated use size="sm" */
  small?: boolean;
};

const WORDMARK_SRC: Record<Variant, string> = {
  sand: "/brand/wordmark-dots.svg",
  mono: "/brand/wordmark-dots-mono.svg",
  negative: "/brand/wordmark-dots-negative.svg",
};

const ISOTYPE_SRC: Record<Variant, string> = {
  sand: "/brand/isotipo-f-dots.svg",
  mono: "/brand/isotipo-f-dots.svg",
  negative: "/brand/isotipo-f-dots-negative.svg",
};

export function BrandWordmark({
  variant = "sand",
  size,
  iconOnly = false,
  animated = false,
  small = false,
}: BrandWordmarkProps) {
  const resolvedSize: Size = size ?? (small ? "sm" : "md");
  const src = iconOnly ? ISOTYPE_SRC[variant] : WORDMARK_SRC[variant];

  return (
    <span
      className={styles.wordmark}
      data-size={resolvedSize}
      data-variant={variant}
      data-icon-only={iconOnly ? "true" : "false"}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="ForMeta"
        className={`${styles.mark} ${animated ? styles.animated : ""}`}
      />
    </span>
  );
}
