import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { SceneTitle } from "../components/SceneTitle";
import { StatRow } from "../components/StatRow";
import type { DashboardData } from "../types";
import { TITLE_FONT, BODY_FONT } from "../fonts";

const formatCurrency = (amount: number): string => {
  if (amount >= 1_000_000_000) {
    const bn = amount / 1_000_000_000;
    return `£${bn.toFixed(2)}bn`;
  }
  if (amount >= 1_000_000) {
    return `£${(amount / 1_000_000).toFixed(0)}m`;
  }
  return `£${(amount / 1_000).toFixed(0)}k`;
};

type ActiveBookSceneProps = {
  data: DashboardData;
};

export const ActiveBookScene: React.FC<ActiveBookSceneProps> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const ext = data.extended;

  const arrearsRate =
    data.metrics.active_loans > 0
      ? ((ext.arrears_count / data.metrics.active_loans) * 100).toFixed(2)
      : "0";

  // Big book size counter animation
  const countDelay = 6;
  const countProgress = interpolate(
    frame,
    [countDelay, countDelay + fps * 1.2],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const displayBook = Math.round(ext.total_book_size * countProgress);

  const bookEntrance = spring({
    frame,
    fps,
    delay: 4,
    config: { damping: 200 },
  });

  const stats = [
    {
      label: "Active Loans",
      value: data.metrics.active_loans.toLocaleString("en-GB"),
    },
    {
      label: "Avg Rate",
      value: `${ext.weighted_avg_rate}%`,
    },
    {
      label: "Arrears",
      value: ext.arrears_count.toString(),
      color: ext.arrears_count > 0 ? "#FF6B6B" : "#00FF88",
    },
    {
      label: "Arrears Rate",
      value: `${arrearsRate}%`,
      color: parseFloat(arrearsRate) > 1 ? "#FF6B6B" : "#00FF88",
    },
  ];

  const bottomStats = [
    {
      label: "Income Booster",
      value: `${ext.income_booster_pct}%`,
      color: "#FF0000",
    },
    {
      label: "NBB Offers",
      value: data.metrics.nbb_offers.toString(),
    },
    {
      label: "Total Offers",
      value: data.metrics.total_offers.toLocaleString("en-GB"),
    },
  ];

  // Divider animation
  const lineWidth = interpolate(frame, [fps * 0.8, fps * 1.4], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 32,
        width: "100%",
        height: "100%",
        justifyContent: "center",
      }}
    >
      <SceneTitle
        title="Active Book"
        subtitle="Portfolio performance snapshot"
        delay={2}
      />

      {/* Big book size number */}
      <div
        style={{
          opacity: interpolate(bookEntrance, [0, 1], [0, 1]),
          transform: `scale(${interpolate(bookEntrance, [0, 1], [0.9, 1])})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
        }}
      >
        <div
          style={{
            fontSize: 80,
            fontWeight: 900,
            color: "white",
            fontFamily: TITLE_FONT,
            lineHeight: 1,
            letterSpacing: "-3px",
          }}
        >
          {formatCurrency(displayBook)}
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "rgba(255,255,255,0.4)",
            textTransform: "uppercase",
            letterSpacing: "4px",
            fontFamily: BODY_FONT,
          }}
        >
          Total Book Size
        </div>
      </div>

      <StatRow stats={stats} delay={10} />

      {/* Divider */}
      <div
        style={{
          width: 700,
          height: 1,
          background: `linear-gradient(to right, transparent, rgba(255,255,255,0.15) ${lineWidth}%, transparent)`,
        }}
      />

      <StatRow stats={bottomStats} delay={18} />
    </div>
  );
};
