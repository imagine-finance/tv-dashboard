import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import type { MonthlyDataPoint } from "../types";
import { BODY_FONT } from "../fonts";

type TrendChartProps = {
  data: MonthlyDataPoint[];
  delay: number;
  color?: string;
  height?: number;
  width?: number;
};

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  delay,
  color = "#FF0000",
  height = 160,
  width = 600,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    delay,
    config: { damping: 200 },
  });

  const maxValue = Math.max(...data.map((d) => d.value));
  const barWidth = Math.floor((width - (data.length - 1) * 12) / data.length);
  const barGap = 12;

  return (
    <div
      style={{
        opacity: interpolate(entrance, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(entrance, [0, 1], [30, 0])}px)`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: barGap,
          height,
          width,
        }}
      >
        {data.map((d, i) => {
          const barDelay = delay + i * 2;
          const barGrow = spring({
            frame,
            fps,
            delay: barDelay,
            config: { damping: 80, stiffness: 100 },
          });

          const barHeight = (d.value / maxValue) * (height - 30);

          return (
            <div
              key={d.month}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                width: barWidth,
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  color: "rgba(255,255,255,0.7)",
                  fontWeight: 700,
                  fontFamily: BODY_FONT,
                  opacity: interpolate(barGrow, [0, 1], [0, 1]),
                }}
              >
                {d.value}
              </div>
              <div
                style={{
                  width: barWidth,
                  height: barHeight * barGrow,
                  borderRadius: 6,
                  background: `linear-gradient(180deg, ${color}, ${color}60)`,
                  minHeight: 2,
                }}
              />
              <div
                style={{
                  fontSize: 22,
                  color: "rgba(255,255,255,0.4)",
                  fontWeight: 400,
                  fontFamily: BODY_FONT,
                }}
              >
                {d.month}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
