import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ForMeta — Sistemas digitales con precisión editorial";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "72px 88px",
          background: "linear-gradient(180deg, #F8F4ED 0%, #F4F0E8 100%)",
          color: "#2C2C28",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontFamily: "monospace",
            fontSize: 18,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "#B8896A",
          }}
        >
          <div style={{ display: "flex", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: "#B8896A" }} />
            <span style={{ width: 6, height: 6, borderRadius: 999, background: "#B8896A", opacity: 0.7 }} />
            <span style={{ width: 6, height: 6, borderRadius: 999, background: "#B8896A", opacity: 0.4 }} />
          </div>
          <span>FORMETA · MALLORCA</span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 28,
            }}
          >
            <svg
              viewBox="0 0 160 200"
              width="120"
              height="150"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M80 12 C80 12 104 52 116 88 C126 118 122 152 102 168 C92 176 80 178 80 178 C80 178 68 176 58 168 C38 152 34 118 44 88 C56 52 80 12 80 12 Z"
                stroke="#2C2C28"
                strokeWidth="6"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <circle cx="80" cy="130" r="9" fill="#B8896A" />
            </svg>
            <div
              style={{
                display: "flex",
                fontSize: 96,
                lineHeight: 1,
                fontFamily: "serif",
                letterSpacing: "-0.02em",
              }}
            >
              <span>F</span>
              <span style={{ fontStyle: "italic", color: "#B8896A" }}>or</span>
              <span>Meta</span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 44,
              lineHeight: 1.15,
              fontFamily: "serif",
              fontWeight: 300,
              color: "#2C2C28",
              maxWidth: 880,
            }}
          >
            Software con <span style={{ fontStyle: "italic", color: "#B8896A", padding: "0 8px" }}>forma</span> propia para operaciones reales.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
            fontFamily: "monospace",
            fontSize: 16,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "#7A7870",
          }}
        >
          <span>formeta.es</span>
          <span>Sistemas digitales · AI aplicada</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
