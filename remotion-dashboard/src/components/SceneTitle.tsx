import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { TITLE_FONT, BODY_FONT } from "../fonts";

type SceneTitleProps = {
  title: string;
  subtitle?: string;
  delay: number;
};

export const SceneTitle: React.FC<SceneTitleProps> = ({
  title,
  subtitle,
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

  return (
    <div
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
          color: "white",
          fontFamily: TITLE_FONT,
          letterSpacing: "-1px",
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: 30,
            fontWeight: 500,
            color: "rgba(255,255,255,0.5)",
            fontFamily: BODY_FONT,
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
};
