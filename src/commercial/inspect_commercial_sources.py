from __future__ import annotations

import argparse
from fnmatch import fnmatch
from io import BytesIO
from pathlib import Path
import unicodedata
import zipfile

import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[2]
RAW_DIR = BASE_DIR / "data" / "raw" / "commercial"

SUPPORTED_SUFFIXES = {".csv", ".xlsx", ".zip"}
SOURCE_GROUPS = {
    "store": (
        "commercial_store_*.csv",
        "store_count_*.csv",
        "business_count_*.csv",
        "*점포-행정동*.csv",
    ),
    "sales": (
        "commercial_sales_*.csv",
        "card_sales_*.csv",
        "estimated_sales_*.csv",
        "*추정매출-행정동*.csv",
    ),
    "facility": (
        "convenience_facilities_*.csv",
        "living_facilities_*.csv",
    ),
}
REGION_COLUMNS = (
    "region_id",
    "행정동코드",
    "행정동_코드",
    "행정동코드명",
    "ADSTRD_CD",
)
DATE_COLUMNS = ("기준일자", "기준년월", "기준_년분기_코드", "기준분기", "기준월")
METRIC_COLUMNS = (
    "카드매출",
    "매출금액",
    "당월_매출_금액",
    "점포수",
    "점포_수",
    "유사_업종_점포_수",
    "업종수",
    "사업체수",
    "시설수",
)
LOCATION_COLUMNS = (
    "주소",
    "소재지",
    "도로명주소",
    "위도",
    "경도",
    "x",
    "y",
)


def read_csv_profile(open_binary) -> tuple[str, list[str], int]:
    for encoding in ("utf-8-sig", "cp949"):
        try:
            sample = pd.read_csv(open_binary(), encoding=encoding, dtype=str, nrows=0)
            row_count = sum(
                len(chunk)
                for chunk in pd.read_csv(
                    open_binary(),
                    encoding=encoding,
                    dtype=str,
                    chunksize=10000,
                )
            )
            return encoding, list(sample.columns), row_count
        except UnicodeDecodeError:
            continue

    raise UnicodeDecodeError("csv", b"", 0, 1, "unsupported csv encoding")


def read_xlsx_profiles(data: bytes) -> list[dict[str, object]]:
    workbook = pd.ExcelFile(BytesIO(data))
    reports = []
    for sheet_name in workbook.sheet_names:
        sample = pd.read_excel(workbook, sheet_name=sheet_name, dtype=str, nrows=0)
        rows = pd.read_excel(workbook, sheet_name=sheet_name, dtype=str)
        reports.append(
            build_tabular_report(
                kind="xlsx",
                encoding="xlsx",
                columns=list(sample.columns),
                row_count=len(rows),
                sheet=sheet_name,
            ),
        )
    return reports


def matching_columns(columns: list[str], candidates: tuple[str, ...]) -> list[str]:
    return [column for column in columns if column in candidates]


def build_tabular_report(
    *,
    kind: str,
    encoding: str,
    columns: list[str],
    row_count: int,
    sheet: str | None = None,
) -> dict[str, object]:
    return {
        "kind": kind,
        "encoding": encoding,
        "rows": row_count,
        "columns": len(columns),
        "sheet": sheet,
        "region_columns": matching_columns(columns, REGION_COLUMNS),
        "date_columns": matching_columns(columns, DATE_COLUMNS),
        "metric_columns": matching_columns(columns, METRIC_COLUMNS),
        "location_columns": matching_columns(columns, LOCATION_COLUMNS),
        "sample_columns": columns[:12],
    }


def inspect_csv(path: Path) -> list[dict[str, object]]:
    encoding, columns, row_count = read_csv_profile(lambda: path.open("rb"))
    report = build_tabular_report(
        kind="csv",
        encoding=encoding,
        columns=columns,
        row_count=row_count,
    )
    report["file"] = path.name
    return [report]


def inspect_xlsx(path: Path) -> list[dict[str, object]]:
    reports = read_xlsx_profiles(path.read_bytes())
    for report in reports:
        report["file"] = path.name
    return reports


def inspect_zip(path: Path) -> list[dict[str, object]]:
    reports: list[dict[str, object]] = []
    with zipfile.ZipFile(path) as archive:
        members = [member for member in archive.namelist() if not member.endswith("/")]
        reports.append({"file": path.name, "kind": "zip", "members": len(members)})

        for member in members:
            suffix = Path(member).suffix.lower()
            if suffix == ".csv":
                encoding, columns, row_count = read_csv_profile(
                    lambda member=member: archive.open(member),
                )
                report = build_tabular_report(
                    kind="zip/csv",
                    encoding=encoding,
                    columns=columns,
                    row_count=row_count,
                )
                report["file"] = path.name
                report["member"] = member
                reports.append(report)
            elif suffix == ".xlsx":
                reports.extend(
                    {
                        **report,
                        "file": path.name,
                        "member": member,
                    }
                    for report in read_xlsx_profiles(archive.read(member))
                )

    return reports


def inspect_file(path: Path) -> list[dict[str, object]]:
    suffix = path.suffix.lower()
    if suffix == ".csv":
        return inspect_csv(path)
    if suffix == ".xlsx":
        return inspect_xlsx(path)
    if suffix == ".zip":
        return inspect_zip(path)

    return [{"file": path.name, "kind": "unsupported"}]


def matching_source_groups(path: Path) -> list[str]:
    file_name = unicodedata.normalize("NFC", path.name)
    return [
        source_group
        for source_group, patterns in SOURCE_GROUPS.items()
        if any(fnmatch(file_name, pattern) for pattern in patterns)
    ]


def format_count(value: object) -> str:
    if isinstance(value, int):
        return f"{value:,}"
    return "-"


def print_source_group_summary(files: list[Path]) -> None:
    print("source group summary:")
    for source_group, patterns in SOURCE_GROUPS.items():
        matched_files = [
            path.name
            for path in files
            if any(
                fnmatch(unicodedata.normalize("NFC", path.name), pattern)
                for pattern in patterns
            )
        ]
        print(f"- {source_group}: {len(matched_files):,} file(s)")
        if matched_files:
            for file_name in matched_files:
                print(f"  - {file_name}")
        else:
            print(f"  expected patterns: {patterns}")
    print()


def print_report(reports: list[dict[str, object]]) -> None:
    for report in reports:
        print(f"file: {report['file']}")
        print(f"  kind: {report['kind']}")
        print(f"  source groups: {report['source_groups']}")
        if "member" in report:
            print(f"  member: {report['member']}")
        if "sheet" in report and report["sheet"] is not None:
            print(f"  sheet: {report['sheet']}")
        if "members" in report:
            print(f"  members: {format_count(report['members'])}")
            continue
        if report["kind"] == "unsupported":
            continue

        print(f"  encoding: {report['encoding']}")
        print(f"  rows: {format_count(report['rows'])}")
        print(f"  columns: {format_count(report['columns'])}")
        print(f"  region columns: {report['region_columns']}")
        print(f"  date columns: {report['date_columns']}")
        print(f"  metric columns: {report['metric_columns']}")
        print(f"  location columns: {report['location_columns']}")
        print(f"  sample columns: {report['sample_columns']}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Inspect raw commercial files before region_id normalization.",
    )
    parser.add_argument(
        "--raw-dir",
        type=Path,
        default=RAW_DIR,
        help="Directory containing raw commercial CSV, XLSX, or ZIP files.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.raw_dir.exists():
        raise FileNotFoundError(f"no commercial raw files found under {args.raw_dir}")

    files = sorted(
        path
        for path in args.raw_dir.iterdir()
        if path.is_file() and path.suffix.lower() in SUPPORTED_SUFFIXES
    )
    if not files:
        raise FileNotFoundError(f"no commercial raw files found under {args.raw_dir}")

    reports = [report for path in files for report in inspect_file(path)]
    source_groups_by_file = {
        path.name: matching_source_groups(path)
        for path in files
    }
    for report in reports:
        report["source_groups"] = source_groups_by_file.get(str(report["file"]), [])

    print_source_group_summary(files)
    print_report(reports)


if __name__ == "__main__":
    try:
        main()
    except (FileNotFoundError, UnicodeDecodeError, zipfile.BadZipFile) as error:
        print(error)
        raise SystemExit(1) from error
