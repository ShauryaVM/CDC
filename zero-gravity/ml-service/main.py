from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict, Any

from models.growth import forecast_growth
from models.jobs import predict_jobs
from models.sentiment import analyze_sentiment

app = FastAPI(title="Zero-Gravity ML Service", version="0.1.0")


class GrowthRequest(BaseModel):
    industry_ids: List[str]
    horizon_years: int = 7


class JobsRequest(BaseModel):
    industry_ids: List[str]
    horizon_years: int = 7
    productivity_growth: float = 0.02


class SentimentRequest(BaseModel):
    industry_ids: List[str]
    window: str = "quarterly"
    lag_max: int = 8


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/forecast/growth")
def growth(req: GrowthRequest) -> Dict[str, Any]:
    return forecast_growth(req.industry_ids, req.horizon_years)


@app.post("/jobs")
def jobs(req: JobsRequest) -> Dict[str, Any]:
    return predict_jobs(req.industry_ids, req.horizon_years, req.productivity_growth)


@app.post("/sentiment")
def sentiment(req: SentimentRequest) -> Dict[str, Any]:
    return analyze_sentiment(req.industry_ids, req.window, req.lag_max)


