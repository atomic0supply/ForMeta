import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2C2C28",
          borderRadius: 36,
        }}
      >
        <svg
          viewBox="0 0 160 200"
          width="116"
          height="146"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M80 12 C80 12 104 52 116 88 C126 118 122 152 102 168 C92 176 80 178 80 178 C80 178 68 176 58 168 C38 152 34 118 44 88 C56 52 80 12 80 12 Z"
            stroke="#F4F0E8"
            strokeWidth="5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle cx="80" cy="130" r="7" fill="#B8896A" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
