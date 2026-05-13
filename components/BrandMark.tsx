"use client";

import { useState } from "react";

import styles from "@/styles/brand-mark.module.css";

type BrandMarkProps = {
  size?: "hero" | "header";
  showLabel?: boolean;
};

export function BrandMark({ size = "hero", showLabel = true }: BrandMarkProps) {
  const [hovered, setHovered] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  function updateTilt(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    const factor = size === "header" ? 5 : 8;
    setTilt({ x: x * factor, y: y * -factor });
  }

  function resetTilt() {
    setTilt({ x: 0, y: 0 });
  }

  return (
    <div
      className={styles.shell}
      data-size={size}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        resetTilt();
      }}
      onFocus={() => setHovered(true)}
      onBlur={() => {
        setHovered(false);
        resetTilt();
      }}
      onPointerMove={updateTilt}
      tabIndex={showLabel ? 0 : -1}
      aria-label="Logotipo interactivo de ForMeta"
    >
      <div className={styles.halo} />
      <div
        className={styles.mark}
        style={{
          transform: `rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
        }}
      >
        <svg
          viewBox="0 0 160 200"
          fill="none"
          aria-hidden="true"
          className={`${styles.symbol} ${hovered ? styles.symbolHover : ""}`}
        >
          <path
            d="M80 12 C80 12 104 52 116 88 C126 118 122 152 102 168 C92 176 80 178 80 178 C80 178 68 176 58 168 C38 152 34 118 44 88 C56 52 80 12 80 12 Z"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinejoin="round"
            strokeLinecap="round"
            className={styles.dropPath}
          />
          <circle
            cx="80"
            cy="130"
            r="6"
            fill="currentColor"
            className={styles.dropDot}
          />
        </svg>
      </div>
      {showLabel && (
        <div className={styles.label}>
          <span className={`${styles.fm} ${hovered ? styles.hidden : ""}`}>FM</span>
          <span className={`${styles.name} ${hovered ? styles.visible : ""}`}>
            F<em>or</em>Meta
          </span>
        </div>
      )}
    </div>
  );
}
