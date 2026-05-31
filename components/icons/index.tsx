/**
 * Iconografía 24×24 (guide 06).
 * Rejilla 24×24, stroke 1.5 round, currentColor, padding 2u mín.
 * Reemplazan las flechas unicode usadas en CTAs y micro-interacciones.
 */

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 16, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function IconArrowRight(p: IconProps) {
  return (
    <Base {...p}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="13 6 19 12 13 18" />
    </Base>
  );
}

export function IconArrowDown(p: IconProps) {
  return (
    <Base {...p}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="6 13 12 19 18 13" />
    </Base>
  );
}

export function IconArrowUpRight(p: IconProps) {
  return (
    <Base {...p}>
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="9 7 17 7 17 15" />
    </Base>
  );
}

export function IconRefresh(p: IconProps) {
  return (
    <Base {...p}>
      <polyline points="20 8 20 4 16 4" />
      <path d="M20 4a8 8 0 1 1-7.5 5" />
    </Base>
  );
}

export function IconChevronDown(p: IconProps) {
  return (
    <Base {...p}>
      <polyline points="6 9 12 15 18 9" />
    </Base>
  );
}

export function IconClose(p: IconProps) {
  return (
    <Base {...p}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </Base>
  );
}

export function IconCheck(p: IconProps) {
  return (
    <Base {...p}>
      <polyline points="5 12 10 17 19 8" />
    </Base>
  );
}

export function IconPlus(p: IconProps) {
  return (
    <Base {...p}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </Base>
  );
}
