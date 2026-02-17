import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { SceneTitle } from "../components/SceneTitle";
import { TrendChart } from "../components/TrendChart";
import { StatRow } from "../components/StatRow";
import type { DashboardData } from "../types";
import { BODY_FONT } from "../fonts";

const formatCurrency = (amount: number): string => {
  if (amount >= 1_000_000) {
    return `£${(amount / 1_000_000).toFixed(1)}m`;
  }
  return `£${(amount / 1_000).toFixed(0)}k`;
};

type LendingSceneProps = {
  data: DashboardData;
};

export const LendingScene: React.FC<LendingSceneProps> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const ext = data.extended;
  const totalPurpose = ext.purchase_count + ext.remortgage_count;
  const purchasePct =
    totalPurpose > 0 ? Math.round((ext.purchase_count / totalPurpose) * 100) : 0;

  const stats = [
    {
      label: "Avg Loan",
      value: formatCurrency(ext.avg_loan_size),
    },
    {
      label: "Avg LTV",
      value: `${ext.avg_ltv}%`,
    },
    {
      label: "Conversion",
      value: `${ext.offer_to_completion_rate}%`,
      color: "#00FF88",
    },
    {
      label: "Avg Days to Complete",
      value: `${ext.avg_days_offer_to_completion}`,
    },
  ];

  // Animated line separator
  const lineWidth = interpolate(frame, [fps * 0.3, fps * 1.0], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 28,
        width: "100%",
        height: "100%",
        justifyContent: "center",
      }}
    >
      <SceneTitle
        title={`${data.metrics.total_owners.toLocaleString("en-GB")} Owners Helped Buy a Home`}
        subtitle="Completions over the last 6 months"
        delay={4}
      />

      <TrendChart
        data={ext.monthly_completions}
        delay={8}
        color="#FF0000"
        height={220}
        width={900}
      />

      {/* Divider */}
      <div
        style={{
          width: 700,
          height: 1,
          background: `linear-gradient(to right, transparent, rgba(255,255,255,0.15) ${lineWidth}%, transparent)`,
        }}
      />

      <StatRow stats={stats} delay={14} />

      {/* Purchase vs Remortgage mini indicator */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          opacity: interpolate(frame, [fps * 1.0, fps * 1.4], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <div
          style={{
            fontSize: 22,
            color: "rgba(255,255,255,0.4)",
            fontFamily: BODY_FONT,
            textTransform: "uppercase",
            letterSpacing: "2px",
          }}
        >
          Purchase {purchasePct}%
        </div>
        <div
          style={{
            width: 280,
            height: 10,
            borderRadius: 3,
            background: "rgba(255,255,255,0.1)",
            overflow: "hidden",
            display: "flex",
          }}
        >
          <div
            style={{
              width: `${purchasePct}%`,
              height: "100%",
              background: "#FF0000",
              borderRadius: 3,
            }}
          />
        </div>
        <div
          style={{
            fontSize: 22,
            color: "rgba(255,255,255,0.4)",
            fontFamily: BODY_FONT,
            textTransform: "uppercase",
            letterSpacing: "2px",
          }}
        >
          Remortgage {100 - purchasePct}%
        </div>
      </div>
    </div>
  );
};
