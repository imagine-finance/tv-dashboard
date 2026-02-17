#!/usr/bin/env python3
"""
Fetch dashboard metrics via Lightdash CLI and write to metrics.json.

Usage:
    python3 scripts/fetch-dashboard-metrics.py [--funders-json path/to/funders.json]

This script:
1. Runs SQL queries via `lightdash sql` against production_rdo_replica (Postgres)
2. Parses CSV output into structured data
3. Writes combined data to remotion-dashboard/data/metrics.json

Requires: `lightdash login` and `lightdash config set-project` (production_rdo_replica).
"""

from __future__ import annotations

import csv
import json
import subprocess
import sys
import tempfile
from datetime import date
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
OUTPUT_FILE = PROJECT_ROOT / "remotion-dashboard" / "data" / "metrics.json"

FUNDER_COLORS = {
    "Aston": "#00FF88",
    "Pluto": "#C8A864",
    "Peony": "#00E5CC",
    "Topaz": "#FFFF00",
    "Quartz": "#FFFFFF",
    "Maguire": "#FF6B6B",
    "Furnace": "#FF9F43",
    "Stalagmite": "#A78BFA",
}

DEFAULT_FUNDERS = [
    {"name": "Aston", "current": 1040000000, "limit": 1920000000, "color": "#00FF88"},
    {"name": "Pluto", "current": 27000000, "limit": 30000000, "color": "#C8A864"},
    {"name": "Peony", "current": 16700000, "limit": 100000000, "color": "#00E5CC"},
    {"name": "Topaz", "current": 71300000, "limit": 240000000, "color": "#FFFF00"},
    {"name": "Quartz", "current": 49000000, "limit": 150000000, "color": "#FFFFFF"},
]

DEFAULT_EXTENDED = {
    "monthly_completions": [
        {"month": "Sep", "value": 139},
        {"month": "Oct", "value": 187},
        {"month": "Nov", "value": 154},
        {"month": "Dec", "value": 186},
        {"month": "Jan", "value": 130},
        {"month": "Feb", "value": 73},
    ],
    "avg_loan_size": 255070,
    "avg_ltv": 72.0,
    "purchase_count": 4552,
    "remortgage_count": 329,
    "offer_to_completion_rate": 84.0,
    "avg_days_offer_to_completion": 89,
    "total_book_size": 1148000000,
    "arrears_count": 23,
    "weighted_avg_rate": 5.45,
    "income_booster_pct": 37.0,
    "funder_details": [],
}

# ---------------------------------------------------------------------------
# SQL queries — raw Postgres tables on production_rdo_replica
# ---------------------------------------------------------------------------

# Core metrics — based on the original Gen H Business Metrics Query
METRICS_SQL = """
WITH completed_applications AS (
  SELECT
    ma.id as mortgage_application_id,
    COUNT(DISTINCT a.id) as applicant_count
  FROM mortgage_applications ma
  INNER JOIN loans l ON ma.mortgage_id = l.mortgage_id
  INNER JOIN applicants a ON ma.id = a.mortgage_application_id
  WHERE ma.state IN ('completed', 'disbursed')
    OR l.start_date IS NOT NULL
  GROUP BY ma.id
),
total_owners AS (
  SELECT SUM(applicant_count) as owner_count FROM completed_applications
),
new_build_boost_offers AS (
  SELECT COUNT(DISTINCT mo.id) as nbb_offer_count
  FROM mortgage_offers mo
  INNER JOIN mortgage_applications ma ON mo.mortgage_application_id = ma.id
  INNER JOIN new_build_boost_preferences nbbp ON ma.id = nbbp.mortgage_application_id
  WHERE nbbp.selected = true
    AND mo.discarded_at IS NULL
),
total_offers AS (
  SELECT COUNT(DISTINCT id) as total_offer_count
  FROM mortgage_offers
  WHERE discarded_at IS NULL
),
income_booster_cases AS (
  SELECT COUNT(DISTINCT l.id) as income_booster_count
  FROM loans l
  INNER JOIN mortgages m ON l.mortgage_id = m.id
  INNER JOIN mortgage_applications ma ON m.id = ma.mortgage_id
  INNER JOIN applicants a ON ma.id = a.mortgage_application_id
  WHERE l.redeemed_at IS NULL
    AND a.applicant_type = 'home_booster'
),
active_loans AS (
  SELECT COUNT(DISTINCT id) as total_active_loans
  FROM loans
  WHERE redeemed_at IS NULL
)
SELECT
  COALESCE(cc.completion_count, 0) as completions,
  COALESCE(ow.owner_count, 0) as total_owners,
  COALESCE(nbb.nbb_offer_count, 0) as nbb_offers,
  COALESCE(to_offers.total_offer_count, 0) as total_offers,
  COALESCE(ib.income_booster_count, 0) as income_boosters,
  COALESCE(al.total_active_loans, 0) as active_loans
FROM (
  SELECT COUNT(*) as completion_count FROM completed_applications
) cc
CROSS JOIN total_owners ow
CROSS JOIN new_build_boost_offers nbb
CROSS JOIN total_offers to_offers
CROSS JOIN income_booster_cases ib
CROSS JOIN active_loans al
""".strip()

# Monthly completions (last 7 months)
MONTHLY_COMPLETIONS_SQL = """
SELECT
  TO_CHAR(l.start_date, 'Mon') AS month_label,
  TO_CHAR(l.start_date, 'YYYY-MM') AS month_sort,
  COUNT(*) AS cnt
FROM loans l
WHERE l.start_date IS NOT NULL
  AND l.start_date >= CURRENT_DATE - INTERVAL '7 months'
GROUP BY month_label, month_sort
ORDER BY month_sort
""".strip()

# Extended metrics from raw tables
EXTENDED_METRICS_SQL = """
WITH loan_averages AS (
  SELECT
    ROUND(AVG(original_advance_amount / 100.0)::numeric, 0) AS avg_loan_size,
    ROUND(AVG(interest_rate * 100)::numeric, 2) AS weighted_avg_rate,
    ROUND(SUM(original_advance_amount / 100.0)::numeric, 0) AS total_book_size,
    ROUND(AVG(original_advance_amount::numeric / NULLIF(original_purchase_price_amount, 0)) * 100, 1) AS avg_ltv
  FROM loans
  WHERE start_date IS NOT NULL
    AND redeemed_at IS NULL
    AND original_purchase_price_amount > 0
),
arrears AS (
  SELECT COUNT(DISTINCT amp.loan_id) AS arrears_count
  FROM accounting_missed_payments amp
  INNER JOIN loans l ON amp.loan_id = l.id
  WHERE amp.discarded_at IS NULL
    AND l.redeemed_at IS NULL
    AND amp.payments_missing_amount > 0
),
purpose_split AS (
  SELECT
    COUNT(*) FILTER (WHERE ma.purpose = 'purchase') AS purchase_count,
    COUNT(*) FILTER (WHERE ma.purpose = 'remortgage') AS remortgage_count
  FROM loans l
  INNER JOIN mortgages m ON l.mortgage_id = m.id
  INNER JOIN mortgage_applications ma ON m.id = ma.mortgage_id
  WHERE l.start_date IS NOT NULL
),
offer_conversion AS (
  WITH offer_dates AS (
    SELECT transitionable_id AS ma_id, MIN(created_at) AS offer_date
    FROM state_transitions
    WHERE transitionable_type = 'MortgageApplication' AND to_state = 'offer'
    GROUP BY transitionable_id
  ),
  completion_dates AS (
    SELECT transitionable_id AS ma_id, MIN(created_at) AS completion_date
    FROM state_transitions
    WHERE transitionable_type = 'MortgageApplication' AND to_state = 'application_completed'
    GROUP BY transitionable_id
  )
  SELECT
    ROUND(COUNT(c.ma_id)::numeric * 100.0 / NULLIF(COUNT(o.ma_id), 0), 1) AS offer_to_completion_rate,
    ROUND(AVG(EXTRACT(DAY FROM c.completion_date - o.offer_date))::numeric, 0) AS avg_days_offer_to_completion
  FROM offer_dates o
  LEFT JOIN completion_dates c ON o.ma_id = c.ma_id
),
income_booster_pct AS (
  SELECT
    ROUND(
      COUNT(DISTINCT CASE WHEN a.applicant_type = 'home_booster' THEN l.id END)::numeric * 100.0
      / NULLIF(COUNT(DISTINCT l.id), 0), 1
    ) AS income_booster_pct
  FROM loans l
  INNER JOIN mortgages m ON l.mortgage_id = m.id
  INNER JOIN mortgage_applications ma ON m.id = ma.mortgage_id
  INNER JOIN applicants a ON ma.id = a.mortgage_application_id
  WHERE l.start_date IS NOT NULL
    AND l.redeemed_at IS NULL
)
SELECT
  la.avg_loan_size,
  la.avg_ltv,
  la.weighted_avg_rate,
  la.total_book_size,
  ar.arrears_count,
  ps.purchase_count,
  ps.remortgage_count,
  oc.offer_to_completion_rate,
  oc.avg_days_offer_to_completion,
  ib.income_booster_pct
FROM loan_averages la
CROSS JOIN arrears ar
CROSS JOIN purpose_split ps
CROSS JOIN offer_conversion oc
CROSS JOIN income_booster_pct ib
""".strip()

# Per-funder breakdown
FUNDER_DETAILS_SQL = """
SELECT
  l.funding_line AS funder_name,
  COUNT(*) AS active_loans,
  ROUND(SUM(l.original_advance_amount / 100.0)::numeric, 0) AS current_principal,
  ROUND(AVG(l.interest_rate * 100)::numeric, 2) AS avg_rate
FROM loans l
WHERE l.start_date IS NOT NULL
  AND l.redeemed_at IS NULL
  AND l.funding_line IS NOT NULL
GROUP BY l.funding_line
ORDER BY l.funding_line
""".strip()


# ---------------------------------------------------------------------------
# Lightdash SQL runner
# ---------------------------------------------------------------------------

def run_lightdash_sql(sql, label="query"):
    """Run a SQL query via `lightdash sql` and return rows as list of dicts."""
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w") as tmp:
        tmp_path = tmp.name

    sql_oneline = " ".join(sql.split())
    cmd = ["lightdash", "sql", sql_oneline, "-o", tmp_path]

    print(f"  Running: {label}...")
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

    if result.returncode != 0:
        stderr = result.stderr.strip()
        error_lines = [
            l for l in stderr.split("\n")
            if not l.startswith("(node:") and not l.startswith("- ") and l.strip()
        ]
        if error_lines:
            print(f"  lightdash sql failed for {label}:", file=sys.stderr)
            print("\n".join(error_lines), file=sys.stderr)
        return []

    csv_path = Path(tmp_path)
    if not csv_path.exists() or csv_path.stat().st_size == 0:
        print(f"  No output for {label}")
        return []

    with open(csv_path, "r") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    csv_path.unlink(missing_ok=True)
    return rows


# ---------------------------------------------------------------------------
# Data fetchers
# ---------------------------------------------------------------------------

def fetch_metrics():
    """Fetch the core business metrics."""
    rows = run_lightdash_sql(METRICS_SQL, "core metrics")
    if not rows:
        print("  No data returned, aborting", file=sys.stderr)
        sys.exit(1)

    row = rows[0]
    return {
        "completions": int(float(row["completions"])),
        "total_owners": int(float(row["total_owners"])),
        "nbb_offers": int(float(row["nbb_offers"])),
        "total_offers": int(float(row["total_offers"])),
        "income_boosters": int(float(row["income_boosters"])),
        "active_loans": int(float(row["active_loans"])),
    }


def fetch_extended_metrics():
    """Fetch extended metrics for deep-dive scenes."""
    try:
        # Monthly completions
        monthly_rows = run_lightdash_sql(MONTHLY_COMPLETIONS_SQL, "monthly completions")
        monthly_completions = [
            {"month": r["month_label"].strip(), "value": int(float(r["cnt"]))}
            for r in monthly_rows
        ] if monthly_rows else DEFAULT_EXTENDED["monthly_completions"]

        # Scalar extended metrics
        rows = run_lightdash_sql(EXTENDED_METRICS_SQL, "extended metrics")
        if not rows:
            print("  No extended metrics returned, using defaults")
            ext = dict(DEFAULT_EXTENDED)
            ext["monthly_completions"] = monthly_completions
            return ext

        row = rows[0]
        return {
            "monthly_completions": monthly_completions,
            "avg_loan_size": int(float(row.get("avg_loan_size") or 0)),
            "avg_ltv": float(row.get("avg_ltv") or 0),
            "purchase_count": int(float(row.get("purchase_count") or 0)),
            "remortgage_count": int(float(row.get("remortgage_count") or 0)),
            "offer_to_completion_rate": float(row.get("offer_to_completion_rate") or 0),
            "avg_days_offer_to_completion": int(float(row.get("avg_days_offer_to_completion") or 0)),
            "total_book_size": int(float(row.get("total_book_size") or 0)),
            "arrears_count": int(float(row.get("arrears_count") or 0)),
            "weighted_avg_rate": float(row.get("weighted_avg_rate") or 0),
            "income_booster_pct": float(row.get("income_booster_pct") or 0),
        }

    except Exception as e:
        print(f"  Extended metrics failed ({e}), using defaults")
        return DEFAULT_EXTENDED


def fetch_funder_details():
    """Fetch per-funder active loan detail."""
    try:
        rows = run_lightdash_sql(FUNDER_DETAILS_SQL, "funder details")
        if not rows:
            return []

        return [
            {
                "name": r["funder_name"],
                "color": FUNDER_COLORS.get(r["funder_name"], "#FFFFFF"),
                "active_loans": int(float(r["active_loans"])),
                "current_principal": int(float(r.get("current_principal") or 0)),
                "arrears_count": 0,  # Not available in raw loans table
                "avg_rate": float(r.get("avg_rate") or 0),
            }
            for r in rows
        ]
    except Exception as e:
        print(f"  Funder details failed ({e}), using defaults")
        return []


def load_funders(funders_json_path=None):
    """Load funder limits from JSON file or defaults."""
    if funders_json_path:
        path = Path(funders_json_path)
        if not path.exists():
            print(f"Funders JSON file not found: {path}", file=sys.stderr)
            sys.exit(1)
        with open(path) as f:
            funders = json.load(f)
        for funder in funders:
            if "color" not in funder:
                funder["color"] = FUNDER_COLORS.get(funder["name"], "#FFFFFF")
        return funders

    print("  Using default funder limits (pass --funders-json to override)")
    return DEFAULT_FUNDERS


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    funders_json = None

    args = sys.argv[1:]
    for i, arg in enumerate(args):
        if arg == "--funders-json" and i + 1 < len(args):
            funders_json = args[i + 1]
        elif arg.startswith("--funders-json="):
            funders_json = arg.split("=", 1)[1]

    print("Fetching dashboard metrics via Lightdash CLI (production_rdo_replica)...\n")

    print("[1/5] Core metrics")
    metrics = fetch_metrics()
    print(f"  Completions:     {metrics['completions']:,}")
    print(f"  Total Owners:    {metrics['total_owners']:,}")
    print(f"  NBB Offers:      {metrics['nbb_offers']:,}")
    print(f"  Total Offers:    {metrics['total_offers']:,}")
    print(f"  Income Boosters: {metrics['income_boosters']:,}")
    print(f"  Active Loans:    {metrics['active_loans']:,}")

    print("\n[2/5] Extended metrics")
    extended = fetch_extended_metrics()
    print(f"  Avg Loan Size:   \u00a3{extended['avg_loan_size']:,}")
    print(f"  Avg LTV:         {extended['avg_ltv']}%")
    print(f"  Total Book:      \u00a3{extended['total_book_size']:,}")
    print(f"  Avg Rate:        {extended['weighted_avg_rate']}%")
    print(f"  Arrears:         {extended['arrears_count']}")
    print(f"  Conversion:      {extended['offer_to_completion_rate']}%")
    print(f"  Avg Days:        {extended['avg_days_offer_to_completion']}")
    print(f"  Income Booster:  {extended['income_booster_pct']}%")
    print(f"  Monthly:         {[m['month'] + ':' + str(m['value']) for m in extended['monthly_completions']]}")

    print("\n[3/5] Funder details")
    funder_details = fetch_funder_details()
    extended["funder_details"] = funder_details
    for fd in funder_details:
        print(f"  {fd['name']}: {fd['active_loans']} loans, \u00a3{fd['current_principal']:,}")

    print("\n[4/5] Funder limits")
    funders = load_funders(funders_json)
    for f in funders:
        print(f"  {f['name']}: {f['current']:,} / {f['limit']:,}")

    print("\n[5/5] Writing output")
    today = date.today()
    as_of_date = today.strftime("%-d %b %Y")

    output = {
        "metrics": metrics,
        "extended": extended,
        "funders": funders,
        "as_of_date": as_of_date,
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f, indent=2)

    print(f"  Written to {OUTPUT_FILE}")
    print("\nDone! Run `cd remotion-dashboard && npm run render` to rebuild the video.")


if __name__ == "__main__":
    main()
