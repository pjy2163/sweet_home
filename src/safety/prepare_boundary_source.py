from __future__ import annotations

import argparse
from io import BytesIO
from pathlib import Path
import zipfile

import pandas as pd

from build_safety_fact import REGION_MASTER_PATH, normalize_dong_code
from inspect_boundary_source import RAW_BOUNDARY_DIR, read_boundary, resolve_input_path
from map_safety_coordinates import BOUNDARY_REGION_COLUMNS, find_column

DEFAULT_OUTPUT_DRIVER = "GeoJSON"
DEFAULT_SGIS_CODEBOOK_MEMBER = "3. 코드집/1. 행정구역 코드(adm_code).xlsx"
DEFAULT_SGIS_CODEBOOK_SHEET = "2025년 6월"
REGION_ID_SOURCE_DIRECT = "direct"
REGION_ID_SOURCE_SGIS_CODEBOOK = "sgis-codebook"
REGION_ID_SOURCES = (REGION_ID_SOURCE_DIRECT, REGION_ID_SOURCE_SGIS_CODEBOOK)
SGIS_REGION_COLUMNS = ("ADM_CD", "adm_cd")


def resolve_region_column(boundary, region_column: str | None) -> str:
    resolved = region_column or find_column(boundary.columns, BOUNDARY_REGION_COLUMNS)
    if resolved is None:
        raise ValueError(
            "boundary file must include an administrative-dong code column. "
            f"candidates: {BOUNDARY_REGION_COLUMNS}. "
            "Pass --region-column if the boundary uses a different name.",
        )
    return resolved


def normalize_name_key(district: pd.Series, dong: pd.Series) -> pd.Series:
    normalized_district = district.fillna("").astype(str).str.strip()
    normalized_dong = (
        dong.fillna("")
        .astype(str)
        .str.replace("·", ".", regex=False)
        .str.replace(r"\s+", "", regex=True)
    )
    return normalized_district + "|" + normalized_dong


def resolve_sgis_region_column(boundary, region_column: str | None) -> str:
    resolved = region_column or find_column(boundary.columns, SGIS_REGION_COLUMNS)
    if resolved is None:
        raise ValueError(
            "SGIS boundary mapping requires an SGIS administrative-dong code column. "
            f"candidates: {SGIS_REGION_COLUMNS}. Pass --region-column if needed.",
        )
    return resolved


def read_sgis_codebook(
    input_path: Path,
    codebook_member: str,
    codebook_sheet: str,
) -> pd.DataFrame:
    if input_path.suffix.lower() != ".zip":
        raise ValueError("SGIS codebook mapping requires the original SGIS ZIP input.")

    with zipfile.ZipFile(input_path) as archive:
        if codebook_member not in archive.namelist():
            raise ValueError(f"{codebook_member} is not found in {input_path}.")
        codebook_bytes = BytesIO(archive.read(codebook_member))

    codebook = pd.read_excel(
        codebook_bytes,
        sheet_name=codebook_sheet,
        dtype=str,
        header=1,
    )
    required_columns = {
        "시도코드",
        "시도명칭",
        "시군구코드",
        "시군구명칭",
        "읍면동코드",
        "읍면동명칭",
    }
    missing_columns = required_columns - set(codebook.columns)
    if missing_columns:
        raise ValueError(
            "SGIS codebook is missing required columns: "
            f"{sorted(missing_columns)}",
        )
    return codebook.dropna(subset=["시도코드", "시군구코드", "읍면동코드"]).copy()


def build_unambiguous_name_mapping(region_master: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    mapping = region_master[["시군구명", "행정동명", "region_id"]].copy()
    mapping["name_key"] = normalize_name_key(mapping["시군구명"], mapping["행정동명"])
    region_counts = mapping.groupby("name_key")["region_id"].nunique()
    ambiguous_keys = set(region_counts[region_counts > 1].index)
    unambiguous = mapping[~mapping["name_key"].isin(ambiguous_keys)].copy()
    unambiguous = unambiguous.drop_duplicates(["name_key", "region_id"])
    return unambiguous[["name_key", "region_id"]], len(ambiguous_keys)


def map_sgis_region_ids(
    *,
    boundary: pd.DataFrame,
    input_path: Path,
    region_column: str | None,
    region_master: pd.DataFrame,
    codebook_member: str,
    codebook_sheet: str,
) -> tuple[pd.Series, dict[str, int]]:
    resolved_region_column = resolve_sgis_region_column(boundary, region_column)
    codebook = read_sgis_codebook(input_path, codebook_member, codebook_sheet)
    codebook["sgis_region_id"] = (
        codebook["시도코드"].str.zfill(2)
        + codebook["시군구코드"].str.zfill(3)
        + codebook["읍면동코드"].str.zfill(3)
    )
    codebook["name_key"] = normalize_name_key(
        codebook["시군구명칭"],
        codebook["읍면동명칭"],
    )

    name_mapping, ambiguous_name_keys = build_unambiguous_name_mapping(region_master)
    sgis_mapping = codebook.merge(name_mapping, on="name_key", how="left")
    duplicate_sgis_codes = int(sgis_mapping["sgis_region_id"].duplicated().sum())
    if duplicate_sgis_codes:
        raise ValueError(
            "SGIS codebook produced duplicate administrative-dong codes after "
            f"name mapping. duplicates: {duplicate_sgis_codes:,}",
        )

    region_id_by_sgis_code = dict(
        zip(sgis_mapping["sgis_region_id"], sgis_mapping["region_id"]),
    )
    sgis_code = boundary[resolved_region_column].fillna("").astype(str).str.zfill(8)
    region_ids = sgis_code.map(region_id_by_sgis_code)
    stats = {
        "sgis_codebook_rows": len(codebook),
        "sgis_name_matched_rows": int(sgis_mapping["region_id"].notna().sum()),
        "sgis_name_unmatched_rows": int(sgis_mapping["region_id"].isna().sum()),
        "ambiguous_name_keys": ambiguous_name_keys,
    }
    return region_ids, stats


def resolve_region_ids(
    *,
    boundary: pd.DataFrame,
    input_path: Path,
    region_master: pd.DataFrame,
    args: argparse.Namespace,
) -> tuple[pd.Series, dict[str, int]]:
    if args.region_id_source == REGION_ID_SOURCE_DIRECT:
        region_column = resolve_region_column(boundary, args.region_column)
        return normalize_dong_code(boundary[region_column]), {}

    if args.region_id_source == REGION_ID_SOURCE_SGIS_CODEBOOK:
        return map_sgis_region_ids(
            boundary=boundary,
            input_path=input_path,
            region_column=args.region_column,
            region_master=region_master,
            codebook_member=args.sgis_codebook_member,
            codebook_sheet=args.sgis_codebook_sheet,
        )

    raise ValueError(f"unsupported region id source: {args.region_id_source}")


def prepare_boundary(args: argparse.Namespace):
    input_path = resolve_input_path(args.input, args.raw_dir)
    boundary = read_boundary(input_path, args.member)

    region_master = pd.read_csv(REGION_MASTER_PATH, encoding="utf-8-sig", dtype=str)
    valid_region_ids = set(region_master["region_id"])

    source_rows = len(boundary)
    boundary = boundary.copy()
    boundary["region_id"], mapping_stats = resolve_region_ids(
        boundary=boundary,
        input_path=input_path,
        region_master=region_master,
        args=args,
    )
    matched_mask = boundary["region_id"].isin(valid_region_ids)
    matched_rows = int(matched_mask.sum())
    unmatched_rows = source_rows - matched_rows
    prepared = boundary[matched_mask].copy()

    if prepared.empty:
        raise ValueError(
            "boundary source has no rows matching region_master. "
            f"source rows: {source_rows:,}, unmatched rows: {unmatched_rows:,}",
        )

    duplicate_region_ids = int(prepared["region_id"].duplicated().sum())
    if duplicate_region_ids:
        raise ValueError(
            "prepared boundary has duplicate region_id rows. "
            f"duplicates: {duplicate_region_ids:,}",
        )

    return prepared, {
        "input": str(input_path),
        "source_rows": source_rows,
        "matched_rows": matched_rows,
        "unmatched_rows": unmatched_rows,
        "unique_region_ids": int(prepared["region_id"].nunique()),
        "crs": str(prepared.crs),
        **mapping_stats,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Normalize administrative-dong boundary files to region_master region_id."
        ),
    )
    parser.add_argument("--input", type=Path, help="Boundary SHP/ZIP readable by geopandas.")
    parser.add_argument(
        "--raw-dir",
        type=Path,
        default=RAW_BOUNDARY_DIR,
        help="Directory to scan when --input is omitted.",
    )
    parser.add_argument(
        "--member",
        help="SHP member path inside ZIP when the archive contains multiple SHP files.",
    )
    parser.add_argument(
        "--region-column",
        help="Administrative-dong code column in the boundary source.",
    )
    parser.add_argument(
        "--region-id-source",
        choices=REGION_ID_SOURCES,
        default=REGION_ID_SOURCE_DIRECT,
        help=(
            "How to derive SweetHome region_id from boundary rows. Use "
            "sgis-codebook for SGIS ADM_CD boundaries."
        ),
    )
    parser.add_argument(
        "--sgis-codebook-member",
        default=DEFAULT_SGIS_CODEBOOK_MEMBER,
        help="SGIS adm_code.xlsx member path inside the original SGIS ZIP.",
    )
    parser.add_argument(
        "--sgis-codebook-sheet",
        default=DEFAULT_SGIS_CODEBOOK_SHEET,
        help="SGIS adm_code.xlsx sheet to use for administrative-dong names.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        required=True,
        help="Prepared boundary output path. Keep generated boundary files out of git.",
    )
    parser.add_argument(
        "--driver",
        default=DEFAULT_OUTPUT_DRIVER,
        help="GeoDataFrame output driver. Defaults to GeoJSON.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    prepared, stats = prepare_boundary(args)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    prepared.to_file(args.output, driver=args.driver)

    print(f"input: {stats['input']}")
    print(f"source rows: {stats['source_rows']:,}")
    print(f"matched rows: {stats['matched_rows']:,}")
    print(f"unmatched rows: {stats['unmatched_rows']:,}")
    print(f"unique region ids: {stats['unique_region_ids']:,}")
    if "sgis_codebook_rows" in stats:
        print(f"sgis codebook rows: {stats['sgis_codebook_rows']:,}")
        print(f"sgis name matched rows: {stats['sgis_name_matched_rows']:,}")
        print(f"sgis name unmatched rows: {stats['sgis_name_unmatched_rows']:,}")
        print(f"ambiguous name keys: {stats['ambiguous_name_keys']:,}")
    print(f"crs: {stats['crs']}")
    print(f"saved: {args.output}")


if __name__ == "__main__":
    try:
        main()
    except (FileNotFoundError, ModuleNotFoundError, ValueError) as error:
        print(error)
        raise SystemExit(1) from error
