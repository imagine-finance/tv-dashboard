import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  staticFile,
  Sequence,
  continueRender,
  delayRender,
} from "remotion";
import type { DashboardData } from "./types";
import defaultData from "../data/metrics.json";

import { OverviewScene } from "./scenes/OverviewScene";
import { LendingScene } from "./scenes/LendingScene";
import { ActiveBookScene } from "./scenes/ActiveBookScene";
import { FunderScene } from "./scenes/FunderScene";
import { TITLE_FONT, BODY_FONT } from "./fonts";

const fontStyles = `
@font-face {
  font-family: '${TITLE_FONT}';
  src: url('${staticFile("fonts/TuskerGrotesk-8700Bold.ttf")}') format('truetype');
  font-weight: 700;
  font-style: normal;
}
@font-face {
  font-family: '${BODY_FONT}';
  src: url('${staticFile("fonts/IBMPlexSans-Medium.ttf")}') format('truetype');
  font-weight: 500;
  font-style: normal;
}
`;

// Scene timing (in seconds)
const SCENE_DURATION = 7; // seconds per scene
const TRANSITION = 0.6; // seconds for crossfade transition
const SCENE_COUNT = 4;

export const Dashboard: React.FC<{ data?: DashboardData }> = ({
  data: propData,
}) => {
  const data = propData ?? (defaultData as DashboardData);
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const sceneDurationFrames = Math.round(SCENE_DURATION * fps);
  const transitionFrames = Math.round(TRANSITION * fps);

  // Logo fade in (persistent across all scenes)
  const logoOpacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Footer fade in
  const footerOpacity = interpolate(frame, [fps * 0.8, fps * 1.2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Calculate scene opacity for crossfade transitions
  const getSceneOpacity = (sceneIndex: number): number => {
    const sceneStart = sceneIndex * sceneDurationFrames;
    const sceneEnd = sceneStart + sceneDurationFrames;

    // Fade in
    const fadeIn = interpolate(
      frame,
      [sceneStart, sceneStart + transitionFrames],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );

    // Fade out
    const fadeOut = interpolate(
      frame,
      [sceneEnd - transitionFrames, sceneEnd],
      [1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );

    // For the last scene, fade out at the very end for seamless loop
    if (sceneIndex === SCENE_COUNT - 1) {
      const loopFadeOut = interpolate(
        frame,
        [durationInFrames - transitionFrames, durationInFrames],
        [1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      );
      return fadeIn * Math.min(fadeOut, loopFadeOut);
    }

    return fadeIn * fadeOut;
  };

  // Scale for a subtle zoom effect during transitions
  const getSceneScale = (sceneIndex: number): number => {
    const sceneStart = sceneIndex * sceneDurationFrames;
    const sceneEnd = sceneStart + sceneDurationFrames;

    const scaleIn = interpolate(
      frame,
      [sceneStart, sceneStart + transitionFrames],
      [0.97, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );

    const scaleOut = interpolate(
      frame,
      [sceneEnd - transitionFrames, sceneEnd],
      [1, 1.02],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );

    if (sceneIndex === SCENE_COUNT - 1) {
      const loopScaleOut = interpolate(
        frame,
        [durationInFrames - transitionFrames, durationInFrames],
        [1, 1.02],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      );
      return scaleIn * Math.min(scaleOut, loopScaleOut);
    }

    return frame < (sceneStart + sceneEnd) / 2 ? scaleIn : scaleOut;
  };

  const scenes = [
    { component: <OverviewScene data={data} />, label: "Overview" },
    { component: <LendingScene data={data} />, label: "Lending" },
    { component: <ActiveBookScene data={data} />, label: "Active Book" },
    { component: <FunderScene data={data} />, label: "Funders" },
  ];

  // Progress dots
  const currentSceneIndex = Math.min(
    Math.floor(frame / sceneDurationFrames),
    SCENE_COUNT - 1,
  );

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        backgroundColor: "#000000",
        fontFamily: BODY_FONT,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: fontStyles }} />
      {/* Scenes layer */}
      {scenes.map((scene, i) => (
        <Sequence
          key={scene.label}
          from={i * sceneDurationFrames}
          durationInFrames={sceneDurationFrames}
          layout="none"
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 1920,
              height: 1080,
              opacity: getSceneOpacity(i),
              transform: `scale(${getSceneScale(i)})`,
              display: "flex",
              flexDirection: "column",
              padding: "80px 50px 60px",
            }}
          >
            {scene.component}
          </div>
        </Sequence>
      ))}

      {/* Persistent logo overlay */}
      <div
        style={{
          position: "absolute",
          top: 24,
          left: 40,
          opacity: logoOpacity,
          zIndex: 10,
        }}
      >
        <img
          src={staticFile("genh.svg")}
          style={{ height: 40, objectFit: "contain" as const }}
        />
      </div>

      {/* Progress dots */}
      <div
        style={{
          position: "absolute",
          bottom: 30,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 12,
          opacity: footerOpacity,
          zIndex: 10,
        }}
      >
        {scenes.map((scene, i) => (
          <div
            key={scene.label}
            style={{
              width: currentSceneIndex === i ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background:
                currentSceneIndex === i
                  ? "#FF0000"
                  : "rgba(255,255,255,0.25)",
              transition: "width 0.3s",
            }}
          />
        ))}
      </div>

      {/* Footer - date */}
      <div
        style={{
          position: "absolute",
          bottom: 28,
          right: 50,
          fontSize: 13,
          color: "#666666",
          fontFamily: BODY_FONT,
          opacity: footerOpacity,
          zIndex: 10,
        }}
      >
        As of {data.as_of_date}
      </div>
    </div>
  );
};
