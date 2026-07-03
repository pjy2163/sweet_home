from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
import pandas as pd

from src.report.generate_report import (
    AGGREGATION_TEXT,
    DATA_SOURCE_TEXT,
    LIMITATION_TEXT,
    RegionSnapshot,
    find_region,
    generate_report,
    render_data_basis,
    render_summary,
    to_region_snapshot,
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


def region_to_response(region: RegionSnapshot) -> dict[str, object]:
    return {
        "region_id": region.region_id,
        "gu_name": region.gu_name,
        "dong_name": region.dong_name,
        "display_name": f"{region.gu_name} {region.dong_name}",
        "price_month": region.price_month,
        "deposit": region.deposit,
        "seoul_deposit": region.seoul_deposit,
        "deposit_ratio": region.deposit_ratio,
        "jeonse": region.jeonse,
        "seoul_jeonse": region.seoul_jeonse,
        "jeonse_ratio": region.jeonse_ratio,
        "volume": region.volume,
        "low_volume": region.low_volume,
        "population_month": region.population_month,
        "living_population": region.living_population,
        "safety_date": region.safety_date,
        "safe_facility_count": region.safe_facility_count,
        "nightlife_count": region.nightlife_count,
        "commercial_date": region.commercial_date,
        "industry_count": region.industry_count,
        "store_count": region.store_count,
        "has_price_data": region.has_price_data,
        "has_population_data": region.has_population_data,
        "has_safety_data": region.has_safety_data,
        "has_commercial_data": region.has_commercial_data,
    }


def resolve_region(snapshot: pd.DataFrame, query: str) -> RegionSnapshot:
    try:
        matched = find_region(snapshot, query)
    except ValueError as error:
        message = str(error)
        if "여러 개" in message:
            raise HTTPException(status_code=400, detail=message) from error

        raise HTTPException(status_code=404, detail=message) from error

    return to_region_snapshot(matched.iloc[0])


def strip_bullet_prefix(lines: list[str]) -> list[str]:
    return [line.removeprefix("- ") for line in lines]


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


@app.get("/compare")
def compare_regions(a: str, b: str) -> dict[str, object]:
    snapshot = read_snapshot()
    region_a = resolve_region(snapshot, a)
    region_b = resolve_region(snapshot, b)

    return {
        "region_a": region_to_response(region_a),
        "region_b": region_to_response(region_b),
        "summary": strip_bullet_prefix(render_summary(region_a, region_b)[1:]),
        "data_basis": strip_bullet_prefix(render_data_basis(region_a, region_b)[1:]),
        "report_text": generate_report(region_a, region_b),
    }
