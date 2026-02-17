import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import type { MetricCardProps } from "../types";
import { TITLE_FONT, BODY_FONT } from "../fonts";

const formatNumber = (n: number): string => {
  return n.toLocaleString("en-GB");
};

export const MetricCard: React.FC<MetricCardProps> = ({
  value,
  label,
  delay,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    delay,
    config: { damping: 200 },
  });

  const translateY = interpolate(entrance, [0, 1], [40, 0]);
  const opacity = interpolate(entrance, [0, 1], [0, 1]);

  // Animate the number counting up
  const countProgress = interpolate(
    frame,
    [delay, delay + fps * 1.2],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const displayValue = Math.round(value * countProgress);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: 560,
        height: 260,
        borderRadius: 20,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        overflow: "hidden",
        opacity,
        transform: `translateY(${translateY}px)`,
        gap: 12,
      }}
    >
      <div
        style={{
          fontSize: 96,
          fontWeight: 900,
          color: "white",
          lineHeight: 1,
          fontFamily: TITLE_FONT,
          letterSpacing: "-2px",
        }}
      >
        {formatNumber(displayValue)}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: "#FF0000",
          textTransform: "uppercase",
          letterSpacing: "4px",
          fontFamily: BODY_FONT,
        }}
      >
        {label}
      </div>
    </div>
  );
};
