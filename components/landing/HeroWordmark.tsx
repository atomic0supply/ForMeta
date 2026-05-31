import styles from "@/styles/landing.module.css";

import { WORDMARK_DOTS, WORDMARK_VIEWBOX } from "./wordmark-dots-data";

/**
 * Wordmark hero — versión canónica halftone.
 *
 * Renderiza los 156 dots de `public/brand/wordmark-dots.svg` ordenados
 * por distancia al centro (assembly del centro hacia fuera) con un
 * stagger de 6ms por dot. Total ≈ 1.5s reveal + opacidad final propia
 * de cada dot. Conserva los colores ink/terra y las opacidades del
 * archivo source — no se hardcodea ningún visual extra.
 *
 * Acompaña al subtítulo y el crosshair-pivot ya no es necesario
 * (la marca es lo halftone, no el crosshair).
 */
export function HeroWordmark() {
  const { w, h } = WORDMARK_VIEWBOX;
  return (
    <div className={styles.heroWordmark} aria-label="ForMeta">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className={styles.heroWordmarkSvg}
        aria-hidden="true"
        focusable="false"
        preserveAspectRatio="xMidYMid meet"
      >
        {WORDMARK_DOTS.map((d, i) => (
          <circle
            key={i}
            cx={d.cx}
            cy={d.cy}
            r={d.r}
            fill={d.fill}
            className={styles.heroWordmarkDot}
            style={
              {
                "--i": i,
                "--final-op": d.op,
              } as React.CSSProperties
            }
          />
        ))}
      </svg>
    </div>
  );
}
