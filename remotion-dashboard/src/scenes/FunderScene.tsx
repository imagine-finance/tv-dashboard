import React from "react";
import { SceneTitle } from "../components/SceneTitle";
import { HorizontalBar } from "../components/HorizontalBar";
import type { DashboardData } from "../types";

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

type FunderSceneProps = {
  data: DashboardData;
};

export const FunderScene: React.FC<FunderSceneProps> = ({ data }) => {
  const barItems = data.funders.map((funder) => {
    const detail = data.extended.funder_details.find(
      (d) => d.name === funder.name,
    );
    const pct = Math.round((funder.current / funder.limit) * 100);

    return {
      label: funder.name,
      value: funder.current,
      maxValue: funder.limit,
      color: funder.color,
      displayValue: `${formatCurrency(funder.current)} / ${formatCurrency(funder.limit)}`,
      subLabel: detail
        ? `${detail.active_loans.toLocaleString("en-GB")} loans  ·  ${pct}% utilised`
        : `${pct}% utilised`,
    };
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
        padding: "0 120px",
      }}
    >
      <SceneTitle
        title="Funder Utilisation"
        subtitle="Current allocation vs. facility limits"
        delay={2}
      />

      <div style={{ width: "100%" }}>
        <HorizontalBar items={barItems} delay={6} barHeight={40} />
      </div>
    </div>
  );
};
