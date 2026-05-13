import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <svg
          viewBox="0 0 160 200"
          width="28"
          height="28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M80 12 C80 12 104 52 116 88 C126 118 122 152 102 168 C92 176 80 178 80 178 C80 178 68 176 58 168 C38 152 34 118 44 88 C56 52 80 12 80 12 Z"
            stroke="#2C2C28"
            strokeWidth="10"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle cx="80" cy="130" r="12" fill="#2C2C28" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
