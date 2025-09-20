import json
from pathlib import Path
from typing import Dict, Any, List

import pandas as pd


DATA_DIR = Path(__file__).resolve().parent.parent / "data"
XLSX_PATH = DATA_DIR / "Business.xlsx"
OUT_JSON = DATA_DIR / "space_economy.json"


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    colmap = {str(c).strip().lower(): c for c in df.columns}
    df = df.rename(columns=colmap)
    # Try to map expected columns
    candidates = {}
    for key in df.columns:
        low = str(key).lower()
        if low in ("year", "time", "date"):
            candidates["year"] = key
        if "industry" in low or "sector" in low or "category" in low:
            candidates["industry_id"] = key
        if "value" in low and ("added" in low or "current" in low or "usd" in low or "nominal" in low):
            candidates["valueAddedCurrentUSD"] = key
        if "employment" in low or "jobs" in low:
            candidates["employment"] = key

    cols = [candidates.get("year"), candidates.get("industry_id"), candidates.get("valueAddedCurrentUSD"), candidates.get("employment")]
    cols = [c for c in cols if c is not None]
    if not cols:
        return pd.DataFrame()
    slim = df[cols].copy()
    renames = {candidates.get("year"): "year"}
    if candidates.get("industry_id"):
        renames[candidates["industry_id"]] = "industry_id"
    if candidates.get("valueAddedCurrentUSD"):
        renames[candidates["valueAddedCurrentUSD"]] = "valueAddedCurrentUSD"
    if candidates.get("employment"):
        renames[candidates["employment"]] = "employment"
    slim = slim.rename(columns=renames)
    # Clean types
    if "year" in slim:
        slim["year"] = pd.to_numeric(slim["year"], errors="coerce").astype("Int64")
    for c in ("valueAddedCurrentUSD", "employment"):
        if c in slim:
            slim[c] = pd.to_numeric(slim[c], errors="coerce")
    # Standardize industry_id
    if "industry_id" in slim:
        slim["industry_id"] = slim["industry_id"].astype(str).str.strip().str.replace(" ", "_", regex=False).str.lower()
    return slim.dropna(subset=["year"]).drop_duplicates()


def ingest_workbook(xlsx_path: Path) -> pd.DataFrame:
    book = pd.ExcelFile(xlsx_path)
    frames: List[pd.DataFrame] = []
    for sheet in book.sheet_names:
        try:
            df = book.parse(sheet)
            norm = _normalize_columns(df)
            if not norm.empty:
                frames.append(norm)
        except Exception:
            continue
    if not frames:
        raise RuntimeError("No usable sheets found in Business.xlsx")
    merged = pd.concat(frames, ignore_index=True)
    # Collapse duplicates by summing values where appropriate
    agg: Dict[str, Any] = {"valueAddedCurrentUSD": "sum"}
    if "employment" in merged:
        agg["employment"] = "sum"
    grouped = merged.groupby(["year", "industry_id"], dropna=True).agg(agg).reset_index()
    return grouped.sort_values(["industry_id", "year"])  # canonical ordering


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not XLSX_PATH.exists():
        raise FileNotFoundError(f"Missing {XLSX_PATH}")
    df = ingest_workbook(XLSX_PATH)
    # Save as row-oriented JSON list
    records = df.to_dict(orient="records")
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False)
    print(f"Wrote {OUT_JSON} with {len(records)} records")


if __name__ == "__main__":
    main()


