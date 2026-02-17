import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import type { FunderRingProps } from "../types";
import { TITLE_FONT, BODY_FONT } from "../fonts";

const formatCurrency = (amount: number): string => {
  if (amount >= 1_000_000_000) {
    const bn = amount / 1_000_000_000;
    return `£${bn % 1 === 0 ? bn.toFixed(0) : bn.toFixed(2)}bn`;
  }
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000;
    return `£${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}m`;
  }
  return `£${(amount / 1_000).toFixed(0)}k`;
};

export const FunderRing: React.FC<FunderRingProps> = ({ funder, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    delay,
    config: { damping: 200 },
  });

  const fillProgress = spring({
    frame,
    fps,
    delay: delay + 5,
    config: { damping: 100, stiffness: 80 },
  });

  const opacity = interpolate(entrance, [0, 1], [0, 1]);
  const scale = interpolate(entrance, [0, 1], [0.8, 1]);

  const size = 150;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const fillRatio = Math.min(funder.current / funder.limit, 1);
  const segmentLength = fillRatio * circumference * fillProgress;
  const dashOffset = 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          position: "relative",
          width: size,
          height: size,
          filter: `drop-shadow(0 0 8px ${funder.color}40)`,
        }}
      >
        <svg width={size} height={size}>
          {/* Background ring */}
          <circle
            r={radius}
            cx={center}
            cy={center}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
          />
          {/* Filled ring */}
          <circle
            r={radius}
            cx={center}
            cy={center}
            fill="none"
            stroke={funder.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${segmentLength} ${circumference}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
          />
        </svg>
        {/* Percentage in center */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            fontWeight: 700,
            color: "white",
            fontFamily: TITLE_FONT,
          }}
        >
          {Math.round(fillRatio * 100 * fillProgress)}%
        </div>
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: funder.color,
          fontFamily: TITLE_FONT,
          textTransform: "uppercase",
          letterSpacing: "2px",
        }}
      >
        {funder.name}
      </div>
      <div
        style={{
          fontSize: 14,
          color: "rgba(255,255,255,0.6)",
          fontFamily: BODY_FONT,
          textAlign: "center",
          lineHeight: 1.3,
        }}
      >
        {formatCurrency(funder.current)}
        <br />
        <span style={{ color: "rgba(255,255,255,0.35)" }}>
          / {formatCurrency(funder.limit)}
        </span>
      </div>
    </div>
  );
};
