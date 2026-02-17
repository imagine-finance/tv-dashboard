import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { TITLE_FONT, BODY_FONT } from "../fonts";

type HorizontalBarItem = {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  displayValue: string;
  subLabel?: string;
};

type HorizontalBarProps = {
  items: HorizontalBarItem[];
  delay: number;
  barHeight?: number;
};

export const HorizontalBar: React.FC<HorizontalBarProps> = ({
  items,
  delay,
  barHeight = 28,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
        width: "100%",
      }}
    >
      {items.map((item, i) => {
        const itemDelay = delay + i * 3;
        const entrance = spring({
          frame,
          fps,
          delay: itemDelay,
          config: { damping: 200 },
        });

        const fillProgress = spring({
          frame,
          fps,
          delay: itemDelay + 4,
          config: { damping: 80, stiffness: 60 },
        });

        const fillWidth = (item.value / item.maxValue) * 100 * fillProgress;

        return (
          <div
            key={item.label}
            style={{
              opacity: interpolate(entrance, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(entrance, [0, 1], [-30, 0])}px)`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: item.color,
                    fontFamily: TITLE_FONT,
                    textTransform: "uppercase",
                    letterSpacing: "2px",
                  }}
                >
                  {item.label}
                </div>
                {item.subLabel && (
                  <div
                    style={{
                      fontSize: 22,
                      color: "rgba(255,255,255,0.4)",
                      fontFamily: BODY_FONT,
                    }}
                  >
                    {item.subLabel}
                  </div>
                )}
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: "white",
                  fontFamily: BODY_FONT,
                }}
              >
                {item.displayValue}
              </div>
            </div>
            <div
              style={{
                width: "100%",
                height: barHeight,
                borderRadius: barHeight / 2,
                background: "rgba(255,255,255,0.08)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${fillWidth}%`,
                  height: "100%",
                  borderRadius: barHeight / 2,
                  background: `linear-gradient(90deg, ${item.color}90, ${item.color})`,
                  boxShadow: `0 0 16px ${item.color}40`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
