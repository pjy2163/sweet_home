from __future__ import annotations

import argparse
from pathlib import Path
import sys

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
SAFETY_SRC = ROOT / "src" / "safety"
if str(SAFETY_SRC) not in sys.path:
    sys.path.insert(0, str(SAFETY_SRC))

from prepare_safety_inputs import prepare_input, validate_region_ids


DEFAULT_WORK_DIR = Path("/private/tmp/sweethome_verify_safety_prepare")
TEST_REGION_ID = "1111053000"


def build_synthetic_input(work_dir: Path) -> Path:
    work_dir.mkdir(parents=True, exist_ok=True)
    input_path = work_dir / "safe_facilities_20260621.csv"
    source = pd.DataFrame(
        [
            {"region_id": TEST_REGION_ID, "시설명": "safe_facility_a"},
            {"region_id": TEST_REGION_ID, "시설명": "safe_facility_b"},
        ],
    )
    source.to_csv(input_path, index=False, encoding="utf-8-sig")
    return input_path


def parse_prepare_namespace(input_path: Path) -> argparse.Namespace:
    return argparse.Namespace(
        input=input_path,
        source_type="safe_facility",
        source_name="synthetic_safe_facility",
        mapping_method="행정동코드",
        date="2026-06-21",
        sheet=None,
        output=None,
    )


def verify(work_dir: Path) -> None:
    input_path = build_synthetic_input(work_dir)
    prepared = prepare_input(parse_prepare_namespace(input_path))
    matched, unmatched = validate_region_ids(prepared)

    assert len(prepared) == 2
    assert int((prepared["region_id"] == TEST_REGION_ID).sum()) == 2
    assert matched == 2
    assert unmatched == 0

    print(f"prepared rows: {len(prepared):,}")
    print(f"matched region rows: {matched:,}")
    print(f"unmatched region rows: {unmatched:,}")
    print(f"input: {input_path}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Verify safety prepared input preserves facility row grain.",
    )
    parser.add_argument(
        "--work-dir",
        type=Path,
        default=DEFAULT_WORK_DIR,
        help="Temporary directory for synthetic input.",
    )
    return parser.parse_args()


def main() -> None:
    verify(parse_args().work_dir)


if __name__ == "__main__":
    main()
