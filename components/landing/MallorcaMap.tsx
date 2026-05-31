import styles from "@/styles/landing.module.css";

/**
 * MallorcaMap — silueta de Mallorca renderizada con halftone canónico
 * (mismo lenguaje que el isotipo y wordmark de la marca).
 *
 * - Path estilizado de la silueta de la isla (Cap de Formentor NE,
 *   Tramuntana NW, Cap de ses Salines S, Palma SW).
 * - Rejilla hexagonal-staggered de dots dentro de un <clipPath> con
 *   el path. Spacing 5, radius variable según distancia al focal.
 * - Mayoría ink #2C2C28 con opacidades 0.65-0.98 (pseudo-aleatorio
 *   determinista por sin(x,y) → SSR estable).
 * - Sprinkle terra #B8896A en posiciones aisladas (carácter de marca).
 * - Marker terra en Palma con ring pulsante (sonar style) → indica
 *   ubicación del estudio.
 * - Compass N + label coordenadas en mono al pie.
 *
 * Server-rendered estático. El pulse usa <animate> SVG nativo.
 */

const MALLORCA_PATH =
  "M 95 245 " +
  "C 80 230 75 200 78 175 " +
  "C 82 145 95 110 130 90 " +
  "C 175 75 230 75 280 88 " +
  "C 310 95 330 105 350 130 " +
  "C 358 145 354 152 338 150 " +
  "C 358 175 365 200 358 225 " +
  "C 348 248 332 268 308 282 " +
  "C 278 297 245 310 218 318 " +
  "C 192 322 172 318 158 312 " +
  "C 138 304 122 296 112 282 " +
  "C 102 270 98 260 104 252 " +
  "C 110 248 102 247 95 245 Z";

const VIEWBOX_W = 440;
const VIEWBOX_H = 380;

// Punto focal aproximado del centro geográfico de la isla (para gradient de radio)
const FOCAL_X = 220;
const FOCAL_Y = 195;

// Palma: SW de la isla, donde "está" el estudio
const PALMA_X = 135;
const PALMA_Y = 280;

const SPACING = 5;
const MAX_R = 1.45;
const MIN_R = 0.28;
const DECAY = 120;
const PALMA_CULL = 9; // dots dentro de este radio se eliminan (espacio para el marker)

type MapDot = { x: number; y: number; r: number; op: number; terra: boolean };

function generateDots(): MapDot[] {
  const dots: MapDot[] = [];
  // Bbox aproximado del path: limita el grid para reducir el número de elementos.
  for (let y = 65; y < 325; y += SPACING) {
    const row = Math.round((y - 65) / SPACING);
    const xOff = row % 2 === 0 ? 0 : SPACING / 2;
    for (let x = 60 + xOff; x < 380; x += SPACING) {
      const dx = x - FOCAL_X;
      const dy = y - FOCAL_Y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const r = Math.max(MIN_R, MAX_R - (d / DECAY) * MAX_R * 0.6);
      if (r < MIN_R) continue;

      // Espacio alrededor de Palma para que el marker respire
      const palmaD = Math.hypot(x - PALMA_X, y - PALMA_Y);
      if (palmaD < PALMA_CULL) continue;

      // Opacidad pseudo-aleatoria determinista (sin: estable en SSR/client)
      const op = 0.65 + (Math.sin(x * 0.31 + y * 0.27) * 0.5 + 0.5) * 0.33;
      // Sprinkle terra: ~8% de dots, distribuidos por otro patrón sin
      const terraSeed = Math.sin(x * 0.13 + y * 0.41);
      const terra = terraSeed > 0.86;

      dots.push({ x, y, r, op, terra });
    }
  }
  return dots;
}

const DOTS = generateDots();

export function MallorcaMap({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      className={className ? `${styles.mallorcaMap} ${className}` : styles.mallorcaMap}
      aria-label="Mapa estilizado de Mallorca con la ubicación del estudio en Palma"
      role="img"
    >
      <defs>
        <clipPath id="mallorca-clip" clipPathUnits="userSpaceOnUse">
          <path d={MALLORCA_PATH} />
        </clipPath>
      </defs>

      {/* halftone dots clipados a la silueta */}
      <g clipPath="url(#mallorca-clip)">
        {DOTS.map((d, i) => (
          <circle
            key={i}
            cx={d.x.toFixed(2)}
            cy={d.y.toFixed(2)}
            r={d.r.toFixed(2)}
            fill={d.terra ? "#B8896A" : "#2C2C28"}
            opacity={d.op.toFixed(2)}
          />
        ))}
      </g>

      {/* Marker Palma — dot terra + pulse ring sonar */}
      <g>
        <circle
          cx={PALMA_X}
          cy={PALMA_Y}
          r="3.6"
          fill="#B8896A"
          stroke="#F4F0E8"
          strokeWidth="1.2"
        />
        <circle
          cx={PALMA_X}
          cy={PALMA_Y}
          r="6"
          fill="none"
          stroke="#B8896A"
          strokeWidth="0.6"
          opacity="0.7"
        >
          <animate attributeName="r" values="5;14;5" dur="3.2s" repeatCount="indefinite" />
          <animate
            attributeName="opacity"
            values="0.7;0;0.7"
            dur="3.2s"
            repeatCount="indefinite"
          />
        </circle>
        <text
          x={PALMA_X + 8}
          y={PALMA_Y + 3}
          fontFamily="IBM Plex Mono, monospace"
          fontSize="9"
          letterSpacing="0.16em"
          fill="#B8896A"
          style={{ textTransform: "uppercase" }}
        >
          PALMA · estudio
        </text>
      </g>

      {/* Compass N — tick + label */}
      <g opacity="0.5">
        <line
          x1={FOCAL_X}
          y1="22"
          x2={FOCAL_X}
          y2="38"
          stroke="#2C2C28"
          strokeWidth="0.6"
        />
        <text
          x={FOCAL_X}
          y="18"
          textAnchor="middle"
          fontFamily="IBM Plex Mono, monospace"
          fontSize="9"
          letterSpacing="0.22em"
          fill="#7A7870"
          style={{ textTransform: "uppercase" }}
        >
          N
        </text>
      </g>

      {/* Coordinate label */}
      <text
        x={VIEWBOX_W / 2}
        y={VIEWBOX_H - 12}
        textAnchor="middle"
        fontFamily="IBM Plex Mono, monospace"
        fontSize="9"
        letterSpacing="0.2em"
        fill="#7A7870"
        style={{ textTransform: "uppercase" }}
      >
        39.5696° N · 2.6502° E
      </text>

      {/* Decoration: thin frame ticks at corners */}
      <g stroke="#7A7870" strokeWidth="0.6" opacity="0.45">
        <path d={`M 8 8 L 8 18 M 8 8 L 18 8`} />
        <path d={`M ${VIEWBOX_W - 8} 8 L ${VIEWBOX_W - 8} 18 M ${VIEWBOX_W - 8} 8 L ${VIEWBOX_W - 18} 8`} />
        <path
          d={`M 8 ${VIEWBOX_H - 8} L 8 ${VIEWBOX_H - 18} M 8 ${VIEWBOX_H - 8} L 18 ${VIEWBOX_H - 8}`}
        />
        <path
          d={`M ${VIEWBOX_W - 8} ${VIEWBOX_H - 8} L ${VIEWBOX_W - 8} ${VIEWBOX_H - 18} M ${VIEWBOX_W - 8} ${VIEWBOX_H - 8} L ${VIEWBOX_W - 18} ${VIEWBOX_H - 8}`}
        />
      </g>
    </svg>
  );
}
