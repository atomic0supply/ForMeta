import styles from "@/styles/productos.module.css";

/**
 * Visualización del producto FMTA—STOCK.
 * Línea de consumo real (ink solid) vs predicción IApp (terra dashed)
 * sobre 90 días para un SKU. Umbral clásico en alert dashed + marker
 * "PEDIDO AUTO" en terra. Es la prueba visual del valor: el sistema
 * actúa antes de que la cifra cruce el umbral.
 */
export function StockChart() {
  return (
    <div className={styles.stockChart}>
      <div className={styles.chartHead}>
        <span>
          SKU—4291 · pan integral 500g <b>· 90 días</b>
        </span>
        <span>real / predicción / umbral</span>
      </div>
      <svg viewBox="0 0 800 220" preserveAspectRatio="none" className={styles.chartSvg}>
        {/* grid */}
        <g stroke="#2C2C28" strokeOpacity="0.06">
          <line x1="0" y1="55" x2="800" y2="55" />
          <line x1="0" y1="110" x2="800" y2="110" />
          <line x1="0" y1="165" x2="800" y2="165" />
        </g>
        {/* umbral clásico */}
        <line
          x1="0"
          y1="160"
          x2="800"
          y2="160"
          stroke="#D05A5A"
          strokeDasharray="4 6"
          strokeWidth="1"
        />
        <text
          x="6"
          y="156"
          fill="#D05A5A"
          fontFamily="IBM Plex Mono, monospace"
          fontSize="9"
          letterSpacing="0.1em"
        >
          UMBRAL CLÁSICO
        </text>
        {/* consumo real */}
        <path
          d="M0,180 L40,170 L80,140 L120,120 L160,150 L200,90 L240,110 L280,80 L320,130 L360,70 L400,100 L440,60 L480,90 L520,50 L560,80 L600,40 L640,70 L680,30 L720,60 L760,40 L800,55"
          fill="none"
          stroke="#2C2C28"
          strokeWidth="2"
        />
        {/* predicción IApp */}
        <path
          d="M0,182 L40,168 L80,142 L120,122 L160,148 L200,92 L240,108 L280,82 L320,128 L360,72 L400,98 L440,62 L480,88 L520,52 L560,78 L600,42 L640,68 L680,32 L720,58 L760,42 L800,57"
          fill="none"
          stroke="#B8896A"
          strokeWidth="1.5"
          strokeDasharray="3 4"
        />
        {/* trigger marker */}
        <circle cx="400" cy="100" r="6" fill="#B8896A" stroke="#F4F0E8" strokeWidth="2" />
        <text
          x="408"
          y="96"
          fill="#B8896A"
          fontFamily="IBM Plex Mono, monospace"
          fontSize="9"
          letterSpacing="0.1em"
        >
          PEDIDO AUTO
        </text>
      </svg>
      <div className={styles.chartLegend}>
        <span>
          <i style={{ background: "#2C2C28" }} /> consumo real
        </span>
        <span>
          <i style={{ background: "#B8896A" }} /> predicción IApp
        </span>
        <span>
          <i style={{ background: "#D05A5A" }} /> umbral clásico
        </span>
      </div>
    </div>
  );
}
