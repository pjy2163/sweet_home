from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

from build_safety_fact import DATE_COLUMNS, RAW_DIR, REGION_COLUMNS, STATUS_COLUMNS


def read_header(path: Path) -> tuple[str, list[str], int]:
    for encoding in ("utf-8-sig", "cp949"):
        try:
            sample = pd.read_csv(path, encoding=encoding, dtype=str, nrows=0)
            row_count = sum(
                len(chunk)
                for chunk in pd.read_csv(path, encoding=encoding, dtype=str, chunksize=10000)
            )
            return encoding, list(sample.columns), row_count
        except UnicodeDecodeError:
            continue

    raise UnicodeDecodeError("csv", b"", 0, 1, f"unsupported encoding: {path}")


def matching_columns(columns: list[str], candidates: tuple[str, ...]) -> list[str]:
    return [column for column in columns if column in candidates]


def inspect_file(path: Path) -> dict[str, object]:
    encoding, columns, row_count = read_header(path)
    return {
        "file": path.name,
        "encoding": encoding,
        "rows": row_count,
        "columns": len(columns),
        "region_columns": matching_columns(columns, REGION_COLUMNS),
        "date_columns": matching_columns(columns, DATE_COLUMNS),
        "status_columns": matching_columns(columns, STATUS_COLUMNS),
        "sample_columns": columns[:12],
    }


def print_report(reports: list[dict[str, object]]) -> None:
    for report in reports:
        print(f"file: {report['file']}")
        print(f"  encoding: {report['encoding']}")
        print(f"  rows: {report['rows']:,}")
        print(f"  columns: {report['columns']:,}")
        print(f"  region columns: {report['region_columns']}")
        print(f"  date columns: {report['date_columns']}")
        print(f"  status columns: {report['status_columns']}")
        print(f"  sample columns: {report['sample_columns']}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Inspect raw safety CSV files before administrative-dong mapping.",
    )
    parser.add_argument(
        "--raw-dir",
        type=Path,
        default=RAW_DIR,
        help="Directory containing raw safety CSV files.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    files = sorted(args.raw_dir.glob("*.csv"))
    if not files:
        raise FileNotFoundError(f"no safety CSV files found under {args.raw_dir}")

    print_report([inspect_file(path) for path in files])


if __name__ == "__main__":
    try:
        main()
    except (FileNotFoundError, UnicodeDecodeError) as error:
        print(error)
        raise SystemExit(1) from error
