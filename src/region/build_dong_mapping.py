from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[2]
RAW_PATH = BASE_DIR / "data" / "raw" / "region" / "국가데이터처_법정동 연계정보_20250602.csv"
OUTPUT_PATH = BASE_DIR / "data" / "processed" / "dong_mapping.csv"
MAPPING_KEY_COLUMNS = ["시도명", "시군구명", "행정동명", "법정동코드", "법정동명"]


def main() -> None:
    df = pd.read_csv(RAW_PATH, encoding="cp949", dtype=str)

    mapping = df[
        [
            "시도명",
            "시군구명",
            "행정동코드",
            "행정동명",
            "법정동코드",
            "법정동명",
            "개정일자",
            "연결번호",
        ]
    ].drop_duplicates()

    mapping = mapping[
        (mapping["시도명"] == "서울특별시")
        & (mapping["시군구명"] != mapping["행정동명"])
    ].copy()
    mapping = mapping.sort_values("개정일자", ascending=False)
    mapping = mapping.drop_duplicates(
        subset=MAPPING_KEY_COLUMNS,
        keep="first",
    )
    mapping = mapping.sort_values(["시군구명", "행정동명", "법정동명", "법정동코드"])

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    mapping.to_csv(OUTPUT_PATH, index=False, encoding="utf-8-sig")

    print(mapping.head())
    print(mapping.shape)
    print(f"saved: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
