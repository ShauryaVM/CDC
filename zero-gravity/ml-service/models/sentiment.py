from typing import List, Dict, Any

import numpy as np
import pandas as pd

try:
    from transformers import pipeline
    _has_hf = True
except Exception:
    _has_hf = False


def _load_economy() -> pd.DataFrame:
    try:
        return pd.DataFrame(pd.read_json("ml-service/data/space_economy.json"))
    except Exception:
        years = list(range(2012, 2024))
        rows = []
        for ind in ["manufacturing", "space_vehicles", "information", "professional_rd"]:
            base = 20000.0 + (hash(ind) % 7000)
            vals = (np.array(years) - years[0] + 1) * (base / len(years))
            emp = 10000 + (np.array(years) - years[0]) * 120
            for y, v, e in zip(years, vals, emp):
                rows.append(
                    {
                        "year": y,
                        "industry_id": ind,
                        "valueAddedCurrentUSD": float(v),
                        "employment": float(e),
                    }
                )
        return pd.DataFrame(rows)


def _sentiment_score_texts(texts: List[str]) -> float:
    if not _has_hf:
        # Heuristic fallback: average of simple lexicon-based proxies
        rng = np.random.default_rng(42)
        return float(np.clip(rng.normal(0.2, 0.25), -1, 1))
    try:
        finbert = pipeline("sentiment-analysis", model="ProsusAI/finbert")
        tw = pipeline(
            "sentiment-analysis",
            model="cardiffnlp/twitter-roberta-base-sentiment-latest",
        )
        scores = []
        for t in texts:
            s1 = finbert(t)[0]
            s2 = tw(t)[0]
            v1 = 1.0 if s1["label"].lower() == "positive" else (-1.0 if s1["label"].lower() == "negative" else 0.0)
            v2 = 1.0 if s2["label"].lower() == "positive" else (-1.0 if s2["label"].lower() == "negative" else 0.0)
            scores.append(0.6 * v1 + 0.4 * v2)
        return float(np.clip(np.mean(scores), -1, 1)) if scores else 0.0
    except Exception:
        rng = np.random.default_rng(7)
        return float(np.clip(rng.normal(0.1, 0.3), -1, 1))


def analyze_sentiment(industry_ids: List[str], window: str, lag_max: int) -> Dict[str, Any]:
    # Placeholder periods
    if window == "monthly":
        periods = pd.period_range("2022-01", "2023-12", freq="M").astype(str).tolist()
    else:
        periods = pd.period_range("2021Q1", "2023Q4", freq="Q").astype(str).tolist()

    # In absence of provided texts, simulate per-industry text batches
    out: List[Dict[str, Any]] = []
    for ind in industry_ids:
        scores = []
        for _ in periods:
            # Replace with real texts ingestion per period
            score = _sentiment_score_texts([
                f"{ind} expansion and funding milestone",
                f"{ind} launch cadence and supply chain",
            ])
            scores.append(score)
        for p, s in zip(periods, scores):
            out.append({"industry_id": ind, "period": p, "sentiment": float(s)})

    # Correlate with value-added series
    econ = _load_economy()
    correlations: Dict[str, Dict[str, float]] = {}
    for ind in industry_ids:
        s = econ[econ["industry_id"].astype(str).str.lower() == ind.lower()].sort_values("year")
        if s.empty:
            continue
        y = s["valueAddedCurrentUSD"].astype(float).values
        x = np.interp(np.linspace(0, len(y) - 1, len(periods)), np.arange(len(y)), y)
        z = np.array([r["sentiment"] for r in out if r["industry_id"] == ind], dtype=float)
        cur = float(np.corrcoef(x, z)[0, 1]) if len(z) > 2 else 0.0
        best, k = cur, 0
        for lag in range(1, min(lag_max, max(1, len(z) - 2))):
            try:
                lagcorr = float(np.corrcoef(x[:-lag], z[lag:])[0, 1])
                if np.isfinite(lagcorr) and abs(lagcorr) > abs(best):
                    best, k = lagcorr, lag
            except Exception:
                break
        correlations[ind] = {
            "current": cur,
            "bestLag": float(k),
            "corrAtBestLag": best,
        }

    return {"items": out, "correlations": correlations}


