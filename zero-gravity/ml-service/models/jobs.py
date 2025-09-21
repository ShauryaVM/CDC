from typing import List, Dict, Any

import numpy as np
import pandas as pd

# Base weights for all 50 states + DC (relative concentration). These are
# heuristic but plausible; they will be normalized per year and industry and
# then adjusted by industry-specific bias and drift dynamics.
STATE_BASE_WEIGHTS: Dict[str, float] = {
    # Tier 1 space hubs
    "CA": 1.60, "TX": 1.45, "FL": 1.35, "CO": 1.20, "WA": 1.10, "VA": 1.05,
    "AL": 1.00, "AZ": 0.95, "OH": 0.90, "NM": 0.85,
    # Tier 2 strong contributors
    "MD": 0.95, "MA": 0.95, "DC": 0.90, "NY": 0.88, "PA": 0.86, "NC": 0.84,
    "GA": 0.82, "MO": 0.80, "LA": 0.78, "UT": 0.78, "IL": 0.78, "MI": 0.76,
    # Tier 3 broader base
    "TN": 0.70, "SC": 0.68, "VA": 1.05, "OR": 0.68, "OK": 0.66, "WI": 0.64,
    "MN": 0.66, "IN": 0.64, "NJ": 0.66, "CT": 0.62, "NH": 0.60, "VT": 0.56,
    "ME": 0.56, "RI": 0.56, "DE": 0.58, "KY": 0.60, "AR": 0.58, "MS": 0.56,
    "IA": 0.58, "KS": 0.58, "NE": 0.56, "ND": 0.52, "SD": 0.52, "ID": 0.54,
    "MT": 0.52, "WY": 0.50, "WV": 0.54, "NV": 0.70, "AK": 0.50, "HI": 0.56,
    "NM": 0.85, "PR": 0.40,  # PR placeholder if needed by future UI
}

# Industry-specific emphasis factors (multiplicative on base weights)
INDUSTRY_BIAS: Dict[str, Dict[str, float]] = {
    # Manufacturing supply chains and assembly
    "manufacturing": {
        "CA": 1.12, "TX": 1.10, "AZ": 1.08, "AL": 1.08, "OH": 1.08, "WA": 1.06, "CO": 1.04,
        "MI": 1.06, "MO": 1.04
    },
    # Launch and vehicles operations
    "space_vehicles": {
        "FL": 1.16, "TX": 1.12, "CA": 1.08, "AL": 1.08, "CO": 1.06, "NM": 1.06, "AZ": 1.04, "VA": 1.04
    },
    # Software, data, ground networks
    "information": {
        "CA": 1.16, "WA": 1.12, "NY": 1.10, "MA": 1.08, "DC": 1.06, "VA": 1.06, "CO": 1.04
    },
    # R&D, federal labs, contractors
    "professional_rd": {
        "MA": 1.14, "MD": 1.12, "DC": 1.12, "VA": 1.10, "CA": 1.06, "CO": 1.06
    },
}

def _normalized_state_weights(industry_id: str, rel_year_index: int) -> Dict[str, float]:
    """Compute normalized weights for all states with industry bias and drift.

    rel_year_index is 0 for first forecast year, 1 for next, etc.
    We apply modest drift toward relevant hubs over time.
    """
    # Copy base and apply bias
    weights = STATE_BASE_WEIGHTS.copy()
    bias = INDUSTRY_BIAS.get(industry_id, {})
    for st, b in bias.items():
        if st in weights:
            weights[st] *= b

    # Drift: shift ~1% per year toward top hubs for the industry
    drift_states: List[str]
    if industry_id == "space_vehicles":
        drift_states = ["FL", "TX", "AL", "NM"]
    elif industry_id == "information":
        drift_states = ["CA", "WA", "VA", "CO"]
    elif industry_id == "professional_rd":
        drift_states = ["MA", "MD", "DC", "VA"]
    else:
        drift_states = ["CA", "TX", "AZ", "OH"]

    drift_rate = 0.01  # 1% per year toward hubs
    for st in drift_states:
        if st in weights:
            weights[st] *= (1.0 + drift_rate) ** max(0, rel_year_index)

    # Normalize to sum to 1
    total = float(sum(v for k, v in weights.items() if len(k) <= 2))
    if total <= 0:
        n = sum(1 for k in weights.keys() if len(k) <= 2)
        return {k: 1.0 / max(1, n) for k in weights.keys() if len(k) <= 2}
    return {k: v / total for k, v in weights.items() if len(k) <= 2}

MULTIPLIERS: Dict[str, float] = {"direct": 1.0, "indirect": 0.4, "induced": 0.3}


def _load_economy() -> pd.DataFrame:
    try:
        return pd.DataFrame(pd.read_json("data/space_economy.json"))
    except Exception:
        # fallback aligns with growth._load_economy heuristic to keep API responsive
        years = list(range(2012, 2024))
        rows = []
        for ind in ["manufacturing", "space_vehicles", "information", "professional_rd"]:
            base = 20000.0 + (hash(ind) % 7000)
            vals = (np.array(years) - years[0] + 1) * (base / len(years))
            emp = 10000 + (np.array(years) - years[0]) * 120
            for y, v, e in zip(years, vals, emp):
                rows.append({
                    "year": y,
                    "industry_id": ind,
                    "valueAddedCurrentUSD": float(v),
                    "employment": float(e),
                })
        return pd.DataFrame(rows)


def predict_jobs(industry_ids: List[str], horizon_years: int, productivity_growth: float) -> Dict[str, Any]:
    econ = _load_economy()
    out: List[Dict[str, Any]] = []
    geo: List[Dict[str, Any]] = []  # per-state per-year timeseries

    for ind in industry_ids:
        s = econ[econ["industry_id"].astype(str).str.lower() == ind.lower()].sort_values("year")
        if s.empty:
            continue

        last_year = int(s["year"].max())
        baseline_emp = float(s["employment"].iloc[-1]) if "employment" in s else 10000.0
        value0 = float(s["valueAddedCurrentUSD"].iloc[-1])

        # Simulate value-added growth ratio per year as a placeholder; could consume cached growth
        growth_ratios = np.linspace(1.05, 1.25, horizon_years)

        totals_industry: List[Dict[str, Any]] = []
        for i in range(horizon_years):
            year = last_year + 1 + i
            value_ratio = growth_ratios[i]
            productivity = (1.0 + productivity_growth) ** (i + 1)
            direct = (baseline_emp * value_ratio) / productivity
            indirect = direct * MULTIPLIERS["indirect"]
            induced = (direct + indirect) * MULTIPLIERS["induced"]
            total = direct + indirect + induced

            totals_industry.append(
                {
                    "industry_id": ind,
                    "year": year,
                    "employment_direct": int(direct),
                    "employment_indirect": int(indirect),
                    "employment_induced": int(induced),
                    "employment_total": int(total),
                }
            )

        out += totals_industry

        # allocate every forecast year to all states to form a timeseries
        for idx, row in enumerate(totals_industry):
            year = row["year"]
            total = float(row["employment_total"])
            sw = _normalized_state_weights(ind, idx)
            for st, w in sw.items():
                geo.append({
                    "state": st,
                    "industry_id": ind,
                    "year": int(year),
                    "employment_total": int(round(total * w)),
                })

    return {"items": out, "geo": geo}


