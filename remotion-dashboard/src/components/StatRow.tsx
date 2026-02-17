import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { TITLE_FONT, BODY_FONT } from "../fonts";

type StatItem = {
  label: string;
  value: string;
  color?: string;
};

type StatRowProps = {
  stats: StatItem[];
  delay: number;
};

export const StatRow: React.FC<StatRowProps> = ({ stats, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        display: "flex",
        gap: 60,
        justifyContent: "center",
      }}
    >
      {stats.map((stat, i) => {
        const itemDelay = delay + i * 3;
        const entrance = spring({
          frame,
          fps,
          delay: itemDelay,
          config: { damping: 200 },
        });

        return (
          <div
            key={stat.label}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              opacity: interpolate(entrance, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(entrance, [0, 1], [20, 0])}px)`,
            }}
          >
            <div
              style={{
                fontSize: 64,
                fontWeight: 900,
                color: stat.color ?? "white",
                fontFamily: TITLE_FONT,
                lineHeight: 1,
                letterSpacing: "-1px",
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "rgba(255,255,255,0.5)",
                textTransform: "uppercase",
                letterSpacing: "3px",
                fontFamily: BODY_FONT,
              }}
            >
              {stat.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};
