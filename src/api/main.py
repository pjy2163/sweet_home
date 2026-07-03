from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
import pandas as pd

from src.report.generate_report import (
    AGGREGATION_TEXT,
    DATA_SOURCE_TEXT,
    LIMITATION_TEXT,
)


BASE_DIR = Path(__file__).resolve().parents[2]
SNAPSHOT_PATH = BASE_DIR / "data" / "processed" / "region_comparison_snapshot.csv"


app = FastAPI(
    title="SweetHome API",
    description="SweetHome MVP region comparison API.",
    version="0.1.0",
)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "sweethome-api"}


def read_snapshot() -> pd.DataFrame:
    return pd.read_csv(
        SNAPSHOT_PATH,
        encoding="utf-8-sig",
        dtype={"region_id": str},
    )


def latest_text(snapshot: pd.DataFrame, column: str) -> str | None:
    value = snapshot[column].dropna().max()
    if pd.isna(value):
        return None

    return str(value)


@app.get("/regions")
def list_regions() -> list[dict[str, str]]:
    snapshot = read_snapshot()
    regions = snapshot[
        [
            "region_id",
            "시군구명",
            "행정동명",
        ]
    ].drop_duplicates()

    return [
        {
            "region_id": row.region_id,
            "gu_name": row.시군구명,
            "dong_name": row.행정동명,
            "display_name": f"{row.시군구명} {row.행정동명}",
        }
        for row in regions.itertuples(index=False)
    ]


@app.get("/metadata")
def get_metadata() -> dict[str, object]:
    snapshot = read_snapshot()

    return {
        "source": DATA_SOURCE_TEXT,
        "aggregation": AGGREGATION_TEXT,
        "limitation": LIMITATION_TEXT,
        "region_count": int(snapshot["region_id"].nunique()),
        "price_latest_month": latest_text(snapshot, "가격_기준월"),
        "population_latest_month": latest_text(snapshot, "생활인구_기준월"),
        "safety_latest_date": latest_text(snapshot, "안전_기준일자"),
        "commercial_latest_quarter": latest_text(snapshot, "상권_기준일자"),
    }
