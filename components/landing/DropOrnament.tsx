/**
 * DropOrnament — halftone canónico sobre el path real del símbolo gota.
 *
 * Genera una rejilla hexagonal-staggered de dots con radius variable
 * según distancia al focal point. El SVG <clipPath> con el path
 * canónico se encarga de recortar los dots a la silueta exacta — sin
 * necesidad de point-in-path en JS.
 *
 * Parámetros del guide 03:
 *   spacing 4, maxR 1.8, minR 0.25, decay 38, coreR 4, focal (80,130)
 *
 * El path canónico viene de public/brand/symbol-drop-ink.svg.
 */

const GOTA_D =
  "M80 12 C80 12 104 52 116 88 C126 118 122 152 102 168 C92 176 80 178 80 178 C80 178 68 176 58 168 C38 152 34 118 44 88 C56 52 80 12 80 12 Z";
const FOCAL_X = 80;
const FOCAL_Y = 130;

const SPACING = 4;
const MAX_R = 1.8;
const MIN_R = 0.25;
const DECAY = 38;
const CORE_R = 4;
const CORE_INNER_CULL = 6; // dots dentro de este radio se eliminan (para que el core dot respire)

type Dot = { x: number; y: number; r: number };

/** Rejilla hexagonal-staggered sobre 0..160 × 0..200, sin filtrar por path
 *  (el <clipPath> SVG hace el filtrado a posteriori). Los dots fuera del
 *  bounding box del path tampoco se renderizan visualmente (clip los recorta). */
function generateDots(): Dot[] {
  const dots: Dot[] = [];
  for (let y = SPACING / 2; y < 200; y += SPACING) {
    const rowIdx = Math.round((y - SPACING / 2) / SPACING);
    const xOff = rowIdx % 2 === 0 ? 0 : SPACING / 2;
    for (let x = SPACING / 2 + xOff; x < 160; x += SPACING) {
      const dx = x - FOCAL_X;
      const dy = y - FOCAL_Y;
      const d = Math.sqrt(dx * dx + dy * dy);
      // dots cerca del focal se eliminan — espacio para el core
      if (d < CORE_INNER_CULL) continue;
      const r = Math.max(MIN_R, MAX_R - (d / DECAY) * MAX_R);
      if (r < MIN_R) continue;
      dots.push({ x, y, r });
    }
  }
  return dots;
}

const DOTS = generateDots();

export function DropOrnament({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 160 200" aria-hidden="true">
      <defs>
        <clipPath id="drop-halftone-clip" clipPathUnits="userSpaceOnUse">
          <path d={GOTA_D} />
        </clipPath>
      </defs>
      <g clipPath="url(#drop-halftone-clip)">
        {DOTS.map((d, i) => (
          <circle
            key={i}
            cx={d.x.toFixed(2)}
            cy={d.y.toFixed(2)}
            r={d.r.toFixed(2)}
            fill="currentColor"
          />
        ))}
      </g>
      {/* Core terra dot — siempre encima */}
      <circle cx={FOCAL_X} cy={FOCAL_Y} r={CORE_R} fill="var(--color-terra)" />
    </svg>
  );
}
