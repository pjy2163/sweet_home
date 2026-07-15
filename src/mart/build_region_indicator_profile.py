from __future__ import annotations

from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[2]
SNAPSHOT_PATH = BASE_DIR / "data" / "processed" / "region_comparison_snapshot.csv"
GEOMETRY_PATH = BASE_DIR / "data" / "processed" / "region_geometry.csv"
OUTPUT_PATH = BASE_DIR / "data" / "processed" / "region_indicator_profile.csv"

HIGH_QUANTILE = 0.8
LOW_QUANTILE = 0.2

OUTPUT_COLUMNS = [
    "region_id",
    "시도명",
    "시군구명",
    "행정동명",
    "display_name",
    "area_km2",
    "centroid_lon",
    "centroid_lat",
    "map_x",
    "map_y",
    "가격_기준월",
    "생활인구_기준월",
    "안전_기준일자",
    "상권_기준일자",
    "교통_기준일자",
    "지하철_기준일자",
    "버스_기준일자",
    "안심시설수",
    "안심시설수_면적당",
    "안심시설수_면적당_상대수준",
    "안심시설수_상대수준",
    "유흥시설수",
    "유흥시설수_면적당",
    "유흥시설수_면적당_상대수준",
    "유흥시설수_상대수준",
    "업종수",
    "업종수_상대수준",
    "사업체수",
    "사업체수_면적당",
    "사업체수_면적당_상대수준",
    "사업체수_상대수준",
    "생활인구",
    "생활인구_상대수준",
    "주간생활인구",
    "주간생활인구_상대수준",
    "야간생활인구",
    "야간생활인구_상대수준",
    "주야간생활인구비율",
    "지하철역수",
    "지하철노선수",
    "지하철역_행정동내여부",
    "최근접지하철역명",
    "최근접지하철역거리_m",
    "최근접지하철역거리_상대수준",
    "버스정류소수",
    "버스정류소_면적당",
    "버스정류소_면적당_상대수준",
    "실거래가",
    "실거래가_서울평균대비율",
    "실거래가_서울평균이하여부",
    "전세가",
    "전세가_서울평균대비율",
    "전세가_서울평균이하여부",
    "거래량",
    "거래량_해석주의",
    "안전_데이터여부",
    "상권_데이터여부",
    "생활인구_데이터여부",
    "가격_데이터여부",
    "교통_데이터여부",
    "안전_매칭지표수",
    "편의_매칭지표수",
    "가격_매칭지표수",
    "인구_매칭지표수",
    "교통_매칭지표수",
]


def read_snapshot() -> pd.DataFrame:
    return pd.read_csv(SNAPSHOT_PATH, encoding="utf-8-sig", dtype={"region_id": str})


def read_geometry() -> pd.DataFrame:
    if not GEOMETRY_PATH.exists():
        return pd.DataFrame(
            columns=[
                "region_id",
                "area_km2",
                "centroid_lon",
                "centroid_lat",
                "map_x",
                "map_y",
            ],
        )

    return pd.read_csv(GEOMETRY_PATH, encoding="utf-8-sig", dtype={"region_id": str})


def relative_level(series: pd.Series) -> pd.Series:
    numeric = pd.to_numeric(series, errors="coerce")
    non_null = numeric.dropna()
    levels = pd.Series("데이터없음", index=series.index, dtype="object")

    if non_null.empty:
        return levels

    low_threshold = non_null.quantile(LOW_QUANTILE)
    high_threshold = non_null.quantile(HIGH_QUANTILE)

    levels[numeric.notna()] = "보통"
    levels[numeric <= low_threshold] = "상대적으로낮음"
    levels[numeric >= high_threshold] = "상대적으로높음"
    return levels


def boolean_from_ratio_at_or_below_average(series: pd.Series) -> pd.Series:
    numeric = pd.to_numeric(series, errors="coerce")
    return numeric.le(0).where(numeric.notna(), pd.NA)


def per_area(value: pd.Series, area: pd.Series) -> pd.Series:
    numeric_value = pd.to_numeric(value, errors="coerce")
    numeric_area = pd.to_numeric(area, errors="coerce")
    return numeric_value.where(numeric_area.gt(0)) / numeric_area


def count_matching_indicators(frame: pd.DataFrame, columns: list[str]) -> pd.Series:
    return frame[columns].eq("상대적으로높음").sum(axis=1)


def build_indicator_profile_from_frames(
    snapshot: pd.DataFrame,
    geometry: pd.DataFrame,
) -> pd.DataFrame:
    profile = snapshot.merge(geometry, on="region_id", how="left")

    profile["display_name"] = profile["시군구명"] + " " + profile["행정동명"]
    profile["안심시설수_면적당"] = per_area(profile["안심시설수"], profile["area_km2"])
    profile["유흥시설수_면적당"] = per_area(profile["유흥시설수"], profile["area_km2"])
    profile["사업체수_면적당"] = per_area(profile["사업체수"], profile["area_km2"])
    profile["안심시설수_면적당_상대수준"] = relative_level(profile["안심시설수_면적당"])
    profile["유흥시설수_면적당_상대수준"] = relative_level(profile["유흥시설수_면적당"])
    profile["사업체수_면적당_상대수준"] = relative_level(profile["사업체수_면적당"])
    profile["안심시설수_상대수준"] = relative_level(profile["안심시설수"])
    profile["유흥시설수_상대수준"] = relative_level(profile["유흥시설수"])
    profile["업종수_상대수준"] = relative_level(profile["업종수"])
    profile["사업체수_상대수준"] = relative_level(profile["사업체수"])
    profile["생활인구_상대수준"] = relative_level(profile["생활인구"])
    profile["주간생활인구_상대수준"] = relative_level(profile["주간생활인구"])
    profile["야간생활인구_상대수준"] = relative_level(profile["야간생활인구"])
    profile["지하철역_행정동내여부"] = (
        pd.to_numeric(profile["지하철역수"], errors="coerce")
        .gt(0)
        .where(profile["교통_데이터여부"], pd.NA)
    )
    profile["최근접지하철역거리_상대수준"] = relative_level(
        profile["최근접지하철역거리_m"],
    )
    profile["버스정류소_면적당_상대수준"] = relative_level(
        profile["버스정류소_면적당"],
    )
    profile["실거래가_서울평균이하여부"] = boolean_from_ratio_at_or_below_average(
        profile["실거래가_서울평균대비율"],
    )
    profile["전세가_서울평균이하여부"] = boolean_from_ratio_at_or_below_average(
        profile["전세가_서울평균대비율"],
    )
    low_volume = profile["거래량_해석주의"].fillna(True).astype(bool)
    profile.loc[low_volume, "실거래가_서울평균이하여부"] = False
    profile.loc[low_volume, "전세가_서울평균이하여부"] = False

    profile["안전_매칭지표수"] = 0
    profile["편의_매칭지표수"] = count_matching_indicators(
        profile,
        ["업종수_상대수준", "사업체수_면적당_상대수준"],
    )
    profile["가격_매칭지표수"] = profile[
        ["실거래가_서울평균이하여부", "전세가_서울평균이하여부"]
    ].eq(True).sum(axis=1)
    profile["인구_매칭지표수"] = 0
    profile["교통_매칭지표수"] = (
        profile["지하철역_행정동내여부"].eq(True).astype(int)
        + profile["버스정류소_면적당_상대수준"].eq("상대적으로높음").astype(int)
    )

    profile = profile[OUTPUT_COLUMNS].sort_values(
        ["시군구명", "행정동명", "region_id"],
    )
    validate_indicator_profile(profile)
    return profile


def build_indicator_profile() -> pd.DataFrame:
    return build_indicator_profile_from_frames(read_snapshot(), read_geometry())


def validate_indicator_profile(profile: pd.DataFrame) -> None:
    missing_columns = [
        column for column in OUTPUT_COLUMNS if column not in profile.columns
    ]
    if missing_columns:
        raise ValueError(f"indicator profile columns missing: {missing_columns}")

    duplicate_region_ids = int(profile["region_id"].duplicated().sum())
    null_region_ids = int(profile["region_id"].isna().sum())
    if duplicate_region_ids or null_region_ids:
        raise ValueError(
            "indicator profile key validation failed. "
            f"duplicate region_id rows: {duplicate_region_ids:,}, "
            f"region_id nulls: {null_region_ids:,}",
        )


def print_validation(profile: pd.DataFrame) -> None:
    print(f"output rows: {len(profile):,}")
    print(f"unique region ids: {profile['region_id'].nunique():,}")
    print(f"duplicate region ids: {int(profile['region_id'].duplicated().sum()):,}")
    print(f"null region ids: {int(profile['region_id'].isna().sum()):,}")
    print(
        "safety candidate indicator rows: "
        f"{int(profile['안전_매칭지표수'].gt(0).sum()):,}",
    )
    print(
        "convenience candidate indicator rows: "
        f"{int(profile['편의_매칭지표수'].gt(0).sum()):,}",
    )
    print(
        "price candidate indicator rows: "
        f"{int(profile['가격_매칭지표수'].gt(0).sum()):,}",
    )
    print(
        "population candidate indicator rows: "
        f"{int(profile['인구_매칭지표수'].gt(0).sum()):,}",
    )
    print(
        "transport candidate indicator rows: "
        f"{int(profile['교통_매칭지표수'].gt(0).sum()):,}",
    )


def main() -> None:
    profile = build_indicator_profile()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    profile.to_csv(OUTPUT_PATH, index=False, encoding="utf-8-sig")
    print_validation(profile)
    print(f"saved: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
