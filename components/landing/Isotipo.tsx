import styles from "@/styles/landing.module.css";

import { ISOTIPO_DOTS, ISOTIPO_DOTS_VIEWBOX } from "./isotipo-dots-data";

/**
 * Isotipo "F-dots" inline. Reusa los 259 dots de
 * `public/brand/isotipo-f-dots.svg` para que coincida píxel a píxel
 * con el asset oficial pero al ser inline puede tomar `currentColor`
 * — y por tanto invertirse según hud.dark (sand sobre offblack).
 *
 * Tamaño por defecto 20×24. El `currentColor` reemplaza los fills
 * ink/terra del SVG original; el modo claro queda ink+terra, el modo
 * oscuro queda sand+terra automáticamente vía CSS (.hud.dark).
 */
type Props = {
  size?: number;
  ariaHidden?: boolean;
  className?: string;
};

export function Isotipo({ size = 22, ariaHidden = true, className }: Props) {
  const { w, h } = ISOTIPO_DOTS_VIEWBOX;
  const scale = size / h;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w * scale}
      height={size}
      className={`${styles.isotipo}${className ? ` ${className}` : ""}`}
      aria-hidden={ariaHidden}
      focusable="false"
    >
      {ISOTIPO_DOTS.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={d.fill} opacity={d.op} />
      ))}
    </svg>
  );
}
