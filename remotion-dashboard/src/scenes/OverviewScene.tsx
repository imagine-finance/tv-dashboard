import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { MetricCard } from "../components/MetricCard";
import { FunderRing } from "../components/FunderRing";
import type { DashboardData } from "../types";
import { BODY_FONT } from "../fonts";

const STAGGER = 4;

type OverviewSceneProps = {
  data: DashboardData;
};

export const OverviewScene: React.FC<OverviewSceneProps> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Funder section line wipe
  const lineWidth = interpolate(frame, [fps * 1.0, fps * 1.8], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const metrics = [
    { value: data.metrics.total_owners, label: "Owners Helped Buy a Home", delay: 4 },
    { value: data.metrics.completions, label: "Completions", delay: 4 + STAGGER },
    { value: data.metrics.nbb_offers, label: "NBB Offers", delay: 4 + STAGGER * 2 },
    { value: data.metrics.total_offers, label: "Total Offers", delay: 4 + STAGGER * 3 },
    { value: data.metrics.income_boosters, label: "Income Boosters", delay: 4 + STAGGER * 4 },
    { value: data.metrics.active_loans, label: "Active Loans", delay: 4 + STAGGER * 5 },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        height: "100%",
        justifyContent: "center",
        gap: 20,
      }}
    >
      {/* Metric Cards - Top Row (3) */}
      <div
        style={{
          display: "flex",
          gap: 24,
          justifyContent: "center",
        }}
      >
        {metrics.slice(0, 3).map((m) => (
          <MetricCard
            key={m.label}
            value={m.value}
            label={m.label}
            delay={m.delay}
          />
        ))}
      </div>

      {/* Metric Cards - Bottom Row (3) */}
      <div
        style={{
          display: "flex",
          gap: 24,
          justifyContent: "center",
        }}
      >
        {metrics.slice(3).map((m) => (
          <MetricCard
            key={m.label}
            value={m.value}
            label={m.label}
            delay={m.delay}
          />
        ))}
      </div>

      {/* Funder Section Divider */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          width: "90%",
        }}
      >
        <div
          style={{
            flex: 1,
            height: 1,
            background: `linear-gradient(to right, rgba(255,255,255,0.2) ${lineWidth}%, transparent ${lineWidth}%)`,
          }}
        />
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: "rgba(255,255,255,0.4)",
            textTransform: "uppercase",
            letterSpacing: "4px",
            fontFamily: BODY_FONT,
            opacity: interpolate(frame, [fps * 1.2, fps * 1.6], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          Funders
        </div>
        <div
          style={{
            flex: 1,
            height: 1,
            background: `linear-gradient(to left, rgba(255,255,255,0.2) ${lineWidth}%, transparent ${lineWidth}%)`,
          }}
        />
      </div>

      {/* Funder Rings */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 60,
        }}
      >
        {data.funders.map((funder, i) => (
          <FunderRing
            key={funder.name}
            funder={funder}
            delay={Math.round(fps * 1.3) + i * 3}
          />
        ))}
      </div>
    </div>
  );
};
