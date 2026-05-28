/**
 * SVG estático de la gota en halftone (pre-renderizado server-side a partir del path).
 * Replica el `drop-ornament` que el HTML original genera dinámicamente con canvas/JS.
 */

const GOTA_D =
  "M80 12 C80 12 104 52 116 88 C126 118 122 152 102 168 C92 176 80 178 80 178 C80 178 68 176 58 168 C38 152 34 118 44 88 C56 52 80 12 80 12 Z";
const FOCAL_X = 80;
const FOCAL_Y = 130;

type DotPoint = { x: number; y: number; r: number };

/** Server-side halftone sampling: aproxima el resultado de Path2D + isPointInPath
 *  con una función polinomial cerrada del path (slow pero one-shot en render).
 *  Como aproximación, usamos una elipse vertical centrada en (80, 95) con un
 *  estrechamiento arriba — suficiente para el ornamento visual. */
function generateDots(): DotPoint[] {
  const dots: DotPoint[] = [];
  const spacing = 4;
  const maxR = 1.8;
  const minR = 0.25;
  const decay = 38;

  for (let y = spacing / 2; y < 200; y += spacing) {
    const rowIdx = Math.round((y - spacing / 2) / spacing);
    const xOff = rowIdx % 2 === 0 ? 0 : spacing / 2;
    for (let x = spacing / 2 + xOff; x < 160; x += spacing) {
      // Aproximación del path "gota": elipse desplazada con cuello en y=12
      // path real: y entre 12 y 178, x entre 34 y 126 con curvatura
      const cy = 95;
      const rx = 42 * (1 - Math.max(0, (12 - y) / 80));
      const ry = 83;
      const dx = x - FOCAL_X;
      const dyy = y - cy;
      const inside = (dx * dx) / (rx * rx) + (dyy * dyy) / (ry * ry) <= 1;
      if (!inside) continue;

      const distX = x - FOCAL_X;
      const distY = y - FOCAL_Y;
      const d = Math.sqrt(distX * distX + distY * distY);
      const r = Math.max(minR, maxR - (d / decay) * maxR);
      if (r < 0.2) continue;
      if (d < 6) continue;
      dots.push({ x, y, r });
    }
  }
  return dots;
}

const DOTS = generateDots();

export function DropOrnament({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 160 200" aria-hidden="true">
      <g>
        {DOTS.map((d, i) => (
          <circle key={i} cx={d.x.toFixed(2)} cy={d.y.toFixed(2)} r={d.r.toFixed(2)} fill="currentColor" />
        ))}
        <circle cx={FOCAL_X} cy={FOCAL_Y} r="4" fill="var(--color-ink)" />
      </g>
    </svg>
  );
}

// Suppress unused warning for path constant (kept for future canvas-accurate version)
void GOTA_D;
