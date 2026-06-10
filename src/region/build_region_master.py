from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[2]
RAW_PATH = BASE_DIR / "data" / "raw" / "region" / "국가데이터처_법정동 연계정보_20250602.csv"
OUTPUT_PATH = BASE_DIR / "data" / "processed" / "region_master.csv"


def main() -> None:
    df = pd.read_csv(RAW_PATH, encoding="cp949", dtype=str)

    region = df[["시도명", "시군구명", "행정동코드", "행정동명"]].drop_duplicates()

    region = region[
        (region["시도명"] == "서울특별시")
        & (region["시군구명"] != region["행정동명"])
    ].copy()
    region["region_id"] = region["행정동코드"]

    region = region[
        ["region_id", "시도명", "시군구명", "행정동코드", "행정동명"]
    ].sort_values(["시군구명", "행정동명", "행정동코드"])

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    region.to_csv(OUTPUT_PATH, index=False, encoding="utf-8-sig")

    print(region.head())
    print(region.shape)
    print(f"saved: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
