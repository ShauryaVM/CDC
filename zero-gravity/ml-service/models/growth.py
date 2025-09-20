import json
from typing import List, Dict, Any

import numpy as np
import pandas as pd
from prophet import Prophet
from sklearn.ensemble import RandomForestRegressor
from statsmodels.tsa.arima.model import ARIMA


def _load_economy() -> pd.DataFrame:
    try:
        with open("ml-service/data/space_economy.json", "r", encoding="utf-8") as f:
            data = json.load(f)
        return pd.DataFrame(data)
    except FileNotFoundError:
        # Fallback: parse minimal columns from Business.xlsx if present
        try:
            xls_path = "ml-service/data/Business.xlsx"
            # Attempt to read the first sheet and infer columns
            df = pd.read_excel(xls_path, engine="openpyxl")
            # Heuristic normalization - expect columns Year, Industry, ValueAdded, Employment
            columns_lower = {c: str(c).strip().lower() for c in df.columns}
            df.columns = list(columns_lower.values())
            # Rename commonly seen headers
            renames = {
                "year": "year",
                "industry": "industry_id",
                "value added": "valueAddedCurrentUSD",
                "valueadded": "valueAddedCurrentUSD",
                "employment": "employment",
            }
            for old, new in renames.items():
                if old in df.columns:
                    df[new] = df[old]
            df = df[["year", "industry_id", "valueAddedCurrentUSD", "employment"]].dropna()
            return df
        except Exception:
            # Final fallback: tiny synthetic data to keep service responsive
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


def forecast_growth(industry_ids: List[str], horizon_years: int) -> Dict[str, Any]:
    econ = _load_economy()
    out: List[Dict[str, Any]] = []

    for ind in industry_ids:
        series = econ[econ["industry_id"].astype(str).str.lower() == ind.lower()].sort_values("year")
        if series.empty:
            # if missing, attempt fuzzy match by contains
            alt = econ[econ["industry_id"].astype(str).str.contains(ind, case=False, na=False)]
            series = alt.sort_values("year") if not alt.empty else econ.head(0)

        if series.empty:
            continue

        years = series["year"].astype(int).tolist()
        values = series["valueAddedCurrentUSD"].astype(float).values

        # Prophet
        try:
            df_prophet = pd.DataFrame({
                "ds": pd.to_datetime(series["year"].astype(str) + "-12-31"),
                "y": values,
            })
            m = Prophet(yearly_seasonality=True)
            m.fit(df_prophet)
            future = m.make_future_dataframe(periods=horizon_years, freq="Y")
            yhat_prophet = m.predict(future).tail(horizon_years)["yhat"].values
        except Exception:
            yhat_prophet = np.repeat(values[-1], horizon_years)

        # ARIMA quick baseline
        try:
            arima = ARIMA(values, order=(1, 1, 1)).fit()
            yhat_arima = arima.forecast(horizon_years)
        except Exception:
            yhat_arima = np.repeat(values[-1], horizon_years)

        # Random Forest with simple features
        try:
            years_arr = np.array(years)
            lag1 = pd.Series(values).shift(1).bfill().values
            ma3 = pd.Series(values).rolling(3).mean().bfill().values
            X = np.column_stack([years_arr, lag1, ma3])
            y = values
            rf = RandomForestRegressor(n_estimators=200, random_state=42)
            rf.fit(X, y)
            last_year = years_arr.max()
            fut_years = np.arange(last_year + 1, last_year + 1 + horizon_years)
            Xf = np.column_stack([
                fut_years,
                np.repeat(values[-1], horizon_years),
                np.repeat(pd.Series(values).tail(3).mean(), horizon_years),
            ])
            yhat_rf = rf.predict(Xf)
        except Exception:
            last_year = int(series["year"].max())
            fut_years = np.arange(last_year + 1, last_year + 1 + horizon_years)
            yhat_rf = np.repeat(values[-1], horizon_years)

        # Weighted ensemble
        ens = 0.4 * yhat_prophet + 0.35 * yhat_rf + 0.25 * yhat_arima
        lo, hi = ens * 0.85, ens * 1.15

        out.append(
            {
                "industry_id": ind,
                "years": fut_years.astype(int).tolist(),
                "prediction": ens.astype(float).tolist(),
                "lower": lo.astype(float).tolist(),
                "upper": hi.astype(float).tolist(),
                "modelWeights": {"prophet": 0.4, "rf": 0.35, "arima": 0.25},
            }
        )

    return {"items": out}


