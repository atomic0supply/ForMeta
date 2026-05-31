import styles from "@/styles/productos.module.css";

/**
 * Visualización del producto FMTA—VOZ.
 * Card de "conversación en vivo" con waveform animado (40 barras
 * pulse stagger), cita mallorquina del ejemplo canónico y respuesta
 * estructurada del agente. Bajo, los 3 idiomas soportados.
 */

// Waveform: 40 barras estáticas con altura/posición distintas
const BARS = [
  [0, 32, 16], [8, 28, 24], [16, 20, 40], [24, 14, 52], [32, 10, 60],
  [40, 18, 44], [48, 24, 32], [56, 14, 52], [64, 6, 68], [72, 14, 52],
  [80, 20, 40], [88, 28, 24], [96, 16, 48], [104, 10, 60], [112, 22, 36],
  [120, 14, 52], [128, 20, 40], [136, 28, 24], [144, 32, 16], [152, 24, 32],
  [160, 16, 48], [168, 10, 60], [176, 20, 40], [184, 28, 24], [192, 32, 16],
  [200, 22, 36], [208, 14, 52], [216, 8, 64], [224, 14, 52], [232, 20, 40],
  [240, 28, 24], [248, 32, 16], [256, 24, 32], [264, 16, 48], [272, 10, 60],
  [280, 14, 52], [288, 20, 40], [296, 28, 24], [304, 32, 16], [312, 24, 32],
];

export function VozCard() {
  return (
    <div className={styles.vozCard}>
      <div className={styles.vcHead}>
        <span>conversación · panadería · Manacor · 06:47 AM</span>
        <span>
          <b>● en vivo</b>
        </span>
      </div>

      <svg
        className={styles.waveform}
        viewBox="0 0 600 80"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <g fill="#7A9AAA">
          {BARS.map(([x, y, h], i) => (
            <rect
              key={i}
              className={styles.waveformBar}
              x={x}
              y={y}
              width="3"
              height={h}
              style={{ animationDelay: `${i * 0.05}s` }}
            />
          ))}
        </g>
      </svg>

      <div className={styles.vcQuote}>
        Apunta tres sacos de harina blanca al proveedor de siempre per dimarts, i revisa
        també si ens queda llevat.
      </div>

      <div className={styles.vcReply}>
        <div className={styles.rHead}>FMTA—VOZ ha entendido</div>
        <div>
          <div className={styles.rCheck}>
            <b>Orden:</b> 3 sacos harina blanca → Molins del Camp · entrega martes 02.06
          </div>
          <div className={styles.rCheck}>
            <b>Tarea:</b> revisar stock de levadura · alerta si &lt; 4 kg
          </div>
          <div className={styles.rCheck}>
            <b>Confirmar?</b> di &quot;sí&quot; o &quot;cambia X&quot;
          </div>
        </div>
      </div>

      <div className={styles.langStrip}>
        <div className={styles.lang}>
          <span className={styles.lName}>Mallorquí</span>
          <span className={styles.lTag}>{"// nativo"}</span>
        </div>
        <div className={styles.lang}>
          <span className={styles.lName}>Castellano</span>
          <span className={styles.lTag}>{"// nativo"}</span>
        </div>
        <div className={styles.lang}>
          <span className={styles.lName}>English</span>
          <span className={styles.lTag}>{"// nativo"}</span>
        </div>
      </div>
    </div>
  );
}
