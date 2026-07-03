from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
import pandas as pd


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
