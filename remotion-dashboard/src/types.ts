export type DashboardData = {
  metrics: {
    completions: number;
    total_owners: number;
    nbb_offers: number;
    total_offers: number;
    income_boosters: number;
    active_loans: number;
  };
  // Extended metrics for deep-dive scenes
  extended: {
    monthly_completions: MonthlyDataPoint[];
    avg_loan_size: number;
    avg_ltv: number;
    purchase_count: number;
    remortgage_count: number;
    offer_to_completion_rate: number;
    avg_days_offer_to_completion: number;
    total_book_size: number;
    arrears_count: number;
    weighted_avg_rate: number;
    income_booster_pct: number;
    funder_details: FunderDetail[];
  };
  funders: FunderData[];
  as_of_date: string;
};

export type MonthlyDataPoint = {
  month: string; // e.g. "Sep", "Oct"
  value: number;
};

export type FunderData = {
  name: string;
  current: number;
  limit: number;
  color: string;
};

export type FunderDetail = {
  name: string;
  color: string;
  active_loans: number;
  current_principal: number;
  arrears_count: number;
  avg_rate: number;
};

export type MetricCardProps = {
  value: number;
  label: string;
  delay: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
};

export type FunderRingProps = {
  funder: FunderData;
  delay: number;
};
