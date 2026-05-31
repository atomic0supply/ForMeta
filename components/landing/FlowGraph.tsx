import styles from "@/styles/productos.module.css";

/**
 * Visualización del producto FMTA—FLOW.
 * Grafo: 3 inputs → 3 agents (orquestador en el medio) → 3 outputs.
 * Edges dashed con pulse circles que viajan por los paths via
 * <animateMotion>. Debajo, los 4 agents tipados (extractor, decisor,
 * validador, redactor).
 */
export function FlowGraph() {
  return (
    <>
      <div className={styles.flowCard}>
        <div className={styles.fcHead}>
          <span>flujo · pedido entrante · gestoría · Palma</span>
          <span>
            <b>● activo · 12 agentes</b>
          </span>
        </div>

        <svg
          className={styles.flowGraph}
          viewBox="0 0 900 320"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* inputs */}
          <g>
            <rect className={`${styles.nodeBox} ${styles.nodeInput}`} x="20" y="40" width="140" height="56" rx="6" />
            <text className={styles.nodeSub} x="32" y="60">{"// input"}</text>
            <text className={styles.nodeLabel} x="32" y="82">email cliente</text>

            <rect className={`${styles.nodeBox} ${styles.nodeInput}`} x="20" y="130" width="140" height="56" rx="6" />
            <text className={styles.nodeSub} x="32" y="150">{"// input"}</text>
            <text className={styles.nodeLabel} x="32" y="172">factura · pdf</text>

            <rect className={`${styles.nodeBox} ${styles.nodeInput}`} x="20" y="220" width="140" height="56" rx="6" />
            <text className={styles.nodeSub} x="32" y="240">{"// input"}</text>
            <text className={styles.nodeLabel} x="32" y="262">ERP · stock</text>
          </g>

          {/* agents */}
          <g>
            <rect className={`${styles.nodeBox} ${styles.nodeAgent}`} x="340" y="20" width="180" height="64" rx="6" />
            <text className={`${styles.nodeSub} ${styles.nodeSubAgent}`} x="354" y="42">{"// agent"}</text>
            <text className={`${styles.nodeLabel} ${styles.nodeLabelAgent}`} x="354" y="66">extractor de datos</text>

            <rect className={`${styles.nodeBox} ${styles.nodeAgent}`} x="340" y="124" width="180" height="64" rx="6" />
            <text className={`${styles.nodeSub} ${styles.nodeSubAgent}`} x="354" y="146">{"// agent · orquestador"}</text>
            <text className={`${styles.nodeLabel} ${styles.nodeLabelAgent}`} x="354" y="170">decisor principal</text>

            <rect className={`${styles.nodeBox} ${styles.nodeAgent}`} x="340" y="232" width="180" height="64" rx="6" />
            <text className={`${styles.nodeSub} ${styles.nodeSubAgent}`} x="354" y="254">{"// agent"}</text>
            <text className={`${styles.nodeLabel} ${styles.nodeLabelAgent}`} x="354" y="278">validador · políticas</text>
          </g>

          {/* outputs */}
          <g>
            <rect className={`${styles.nodeBox} ${styles.nodeOutput}`} x="700" y="40" width="180" height="56" rx="6" />
            <text className={styles.nodeSub} x="712" y="60">{"// output"}</text>
            <text className={styles.nodeLabel} x="712" y="82">orden de compra</text>

            <rect className={`${styles.nodeBox} ${styles.nodeOutput}`} x="700" y="130" width="180" height="56" rx="6" />
            <text className={styles.nodeSub} x="712" y="150">{"// output"}</text>
            <text className={styles.nodeLabel} x="712" y="172">albarán + email</text>

            <rect className={`${styles.nodeBox} ${styles.nodeOutput}`} x="700" y="220" width="180" height="56" rx="6" />
            <text className={styles.nodeSub} x="712" y="240">{"// output · excepción"}</text>
            <text className={styles.nodeLabel} x="712" y="262">deriva a humano</text>
          </g>

          {/* edges */}
          <path className={`${styles.flowEdge} ${styles.flowEdgeActive}`} d="M160,68 C240,68 280,52 340,52" />
          <path className={`${styles.flowEdge} ${styles.flowEdgeActive}`} d="M160,158 C240,158 280,156 340,156" />
          <path className={styles.flowEdge} d="M160,248 C240,248 280,260 340,260" />

          <path className={`${styles.flowEdge} ${styles.flowEdgeActive}`} d="M520,52 C580,52 620,148 700,68" />
          <path className={`${styles.flowEdge} ${styles.flowEdgeActive}`} d="M520,156 C600,156 620,156 700,156" />
          <path className={styles.flowEdge} d="M520,156 C580,156 620,250 700,248" />
          <path className={`${styles.flowEdge} ${styles.flowEdgeActive}`} d="M520,260 C600,260 620,156 700,156" />

          {/* pulses traveling along edges */}
          <circle className={styles.flowPulse} r="3">
            <animateMotion dur="2.4s" repeatCount="indefinite" path="M160,68 C240,68 280,52 340,52" />
          </circle>
          <circle className={styles.flowPulse} r="3">
            <animateMotion
              dur="2.4s"
              begin="0.8s"
              repeatCount="indefinite"
              path="M160,158 C240,158 280,156 340,156"
            />
          </circle>
          <circle className={styles.flowPulse} r="3">
            <animateMotion
              dur="2.4s"
              begin="1.6s"
              repeatCount="indefinite"
              path="M520,156 C600,156 620,156 700,156"
            />
          </circle>
        </svg>
      </div>

      <div className={styles.agentsStrip}>
        <div className={styles.agentTile}>
          <div className={styles.aTag}>{"// agent · 01"}</div>
          <div className={styles.aName}>extractor</div>
          <div className={styles.aRole}>lee PDFs, mails, voz · estructura</div>
        </div>
        <div className={styles.agentTile}>
          <div className={styles.aTag}>{"// agent · 02"}</div>
          <div className={styles.aName}>decisor</div>
          <div className={styles.aRole}>orquesta · negocia con otros</div>
        </div>
        <div className={styles.agentTile}>
          <div className={styles.aTag}>{"// agent · 03"}</div>
          <div className={styles.aName}>validador</div>
          <div className={styles.aRole}>aplica políticas de la empresa</div>
        </div>
        <div className={styles.agentTile}>
          <div className={styles.aTag}>{"// agent · 04"}</div>
          <div className={styles.aName}>redactor</div>
          <div className={styles.aRole}>responde en tu tono · tu idioma</div>
        </div>
      </div>
    </>
  );
}
