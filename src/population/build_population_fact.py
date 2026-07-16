from __future__ import annotations

import zipfile
from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[2]
RAW_DIR = BASE_DIR / "data" / "raw" / "population"
REGION_MASTER_PATH = BASE_DIR / "data" / "processed" / "region_master.csv"
OUTPUT_PATH = BASE_DIR / "data" / "processed" / "population_fact.csv"
SOURCE_URL = "https://data.seoul.go.kr/dataList/OA-14991/S/1/datasetView.do"

DATE_COLUMNS = ("기준일ID", "기준일자", "STDR_DE_ID")
TIME_COLUMNS = ("시간대구분", "TMZON_PD_SE")
DONG_CODE_COLUMNS = ("행정동코드", "ADSTRD_CODE_SE")
LIVING_POPULATION_COLUMNS = ("총생활인구수", "TOT_LVPOP_CO")
SOURCE_COLUMNS = set(
    DATE_COLUMNS + TIME_COLUMNS + DONG_CODE_COLUMNS + LIVING_POPULATION_COLUMNS,
)
DAYTIME_HOURS = set(range(9, 19))
NIGHTTIME_HOURS = set(range(19, 24)) | set(range(0, 9))


def find_column(df: pd.DataFrame, candidates: tuple[str, ...]) -> str:
    for candidate in candidates:
        if candidate in df.columns:
            return candidate

    raise ValueError(f"required column not found. candidates={candidates}")


def read_csv(path: Path) -> pd.DataFrame:
    for encoding in ("utf-8-sig", "cp949"):
        try:
            return pd.read_csv(
                path,
                encoding=encoding,
                dtype=str,
                index_col=False,
                usecols=lambda column: column in SOURCE_COLUMNS,
            )
        except UnicodeDecodeError:
            continue

    raise UnicodeDecodeError("csv", b"", 0, 1, f"unsupported encoding: {path}")


def read_zip(path: Path) -> pd.DataFrame:
    frames = []
    with zipfile.ZipFile(path) as archive:
        names = [name for name in archive.namelist() if name.lower().endswith(".csv")]
        if not names:
            raise ValueError(f"zip file has no csv: {path}")

        for name in names:
            with archive.open(name) as file:
                for encoding in ("utf-8-sig", "cp949"):
                    try:
                        frames.append(
                            pd.read_csv(
                                file,
                                encoding=encoding,
                                dtype=str,
                                index_col=False,
                                usecols=lambda column: column in SOURCE_COLUMNS,
                            ),
                        )
                        break
                    except UnicodeDecodeError:
                        file.seek(0)

    return pd.concat(frames, ignore_index=True)


def read_latest_source() -> pd.DataFrame:
    files = sorted(
        [
            *RAW_DIR.glob("LOCAL_PEOPLE_DONG_*.csv"),
            *RAW_DIR.glob("LOCAL_PEOPLE_DONG_*.zip"),
        ],
    )
    if not files:
        raise FileNotFoundError(
            "population source file is missing. "
            f"Download LOCAL_PEOPLE_DONG_*.zip from {SOURCE_URL} "
            f"and place it under {RAW_DIR}.",
        )

    source_path = files[-1]
    if source_path.suffix.lower() == ".zip":
        return read_zip(source_path)

    return read_csv(source_path)


def normalize_month(series: pd.Series) -> pd.Series:
    digits = series.fillna("").astype(str).str.extract(r"(\d{6,8})", expand=False)
    return digits.str.slice(0, 6).str.replace(r"(\d{4})(\d{2})", r"\1-\2", regex=True)


def normalize_dong_code(series: pd.Series) -> pd.Series:
    code = series.fillna("").astype(str).str.extract(r"(\d+)", expand=False)
    return code.where(code.str.len() != 8, code + "00").str.zfill(10)


def infer_source_month(df: pd.DataFrame, date_column: str) -> str:
    month = normalize_month(df[date_column]).dropna().sort_values().max()
    if not month:
        raise ValueError("could not infer source month from population source data")

    return month


def build_population_fact(
    population: pd.DataFrame,
    region_master: pd.DataFrame,
) -> pd.DataFrame:
    date_column = find_column(population, DATE_COLUMNS)
    time_column = find_column(population, TIME_COLUMNS)
    dong_code_column = find_column(population, DONG_CODE_COLUMNS)
    living_population_column = find_column(population, LIVING_POPULATION_COLUMNS)

    prepared = pd.DataFrame(
        {
            "region_id": normalize_dong_code(population[dong_code_column]),
            "기준일자": normalize_month(population[date_column]),
            "시간대": pd.to_numeric(population[time_column], errors="coerce"),
            "생활인구": pd.to_numeric(
                population[living_population_column],
                errors="coerce",
            ),
        },
    )
    valid_region_ids = set(region_master["region_id"])
    prepared = prepared[
        prepared["region_id"].isin(valid_region_ids)
        & prepared["시간대"].between(0, 23)
        & prepared["생활인구"].notna()
    ].copy()
    if prepared.empty:
        raise ValueError("population source has no valid hourly rows")

    keys = ["region_id", "기준일자"]
    overall = prepared.groupby(keys, as_index=False).agg(
        생활인구=("생활인구", "mean"),
    )
    daytime = (
        prepared[prepared["시간대"].isin(DAYTIME_HOURS)]
        .groupby(keys, as_index=False)
        .agg(주간생활인구=("생활인구", "mean"))
    )
    nighttime = (
        prepared[prepared["시간대"].isin(NIGHTTIME_HOURS)]
        .groupby(keys, as_index=False)
        .agg(야간생활인구=("생활인구", "mean"))
    )

    fact = overall.merge(daytime, on=keys, how="left").merge(
        nighttime,
        on=keys,
        how="left",
    )
    fact["주야간생활인구비율"] = (
        fact["주간생활인구"] / fact["야간생활인구"].where(fact["야간생활인구"].gt(0))
    )
    fact["주민등록인구"] = pd.NA
    fact["세대수"] = pd.NA
    numeric_columns = [
        "생활인구",
        "주간생활인구",
        "야간생활인구",
        "주야간생활인구비율",
    ]
    fact[numeric_columns] = fact[numeric_columns].round(2)
    return fact[
        [
            "region_id",
            "기준일자",
            "주민등록인구",
            "생활인구",
            "주간생활인구",
            "야간생활인구",
            "주야간생활인구비율",
            "세대수",
        ]
    ].sort_values(["기준일자", "region_id"])


def main() -> None:
    population = read_latest_source()
    source_rows = len(population)
    region_master = pd.read_csv(REGION_MASTER_PATH, encoding="utf-8-sig", dtype=str)
    fact = build_population_fact(population, region_master)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    fact.to_csv(OUTPUT_PATH, index=False, encoding="utf-8-sig")

    source_month = fact["기준일자"].max()
    print(f"source rows: {source_rows:,}")
    print(f"matched hourly rows: {source_rows:,}")
    print(f"source month: {source_month}")
    print(f"output rows: {len(fact):,}")
    print(f"saved: {OUTPUT_PATH}")


if __name__ == "__main__":
    try:
        main()
    except FileNotFoundError as error:
        print(error)
        raise SystemExit(1) from error
