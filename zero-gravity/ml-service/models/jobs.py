from typing import List, Dict, Any

import numpy as np
import pandas as pd

STATE_WEIGHTS: Dict[str, float] = {
    "CA": 1.4,
    "TX": 1.2,
    "FL": 1.3,
    "CO": 1.1,
    "WA": 1.0,
    "VA": 0.9,
    "AL": 0.8,
    "AZ": 0.8,
    "OH": 0.7,
    "NM": 0.6,
}

MULTIPLIERS: Dict[str, float] = {"direct": 1.0, "indirect": 0.4, "induced": 0.3}


def _load_economy() -> pd.DataFrame:
    try:
        return pd.DataFrame(pd.read_json("ml-service/data/space_economy.json"))
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
    geo: List[Dict[str, Any]] = []

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

        final_total = totals_industry[-1]["employment_total"] if totals_industry else 0
        for st, w in STATE_WEIGHTS.items():
            geo.append({
                "state": st,
                "industry_id": ind,
                "total_2030": int(final_total * w * 0.1),
            })

    return {"items": out, "geo": geo}


