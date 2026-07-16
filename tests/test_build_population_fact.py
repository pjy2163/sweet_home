import pandas as pd

from src.population.build_population_fact import build_population_fact


def test_population_fact_separates_daytime_and_nighttime_presence() -> None:
    source = pd.DataFrame(
        [
            {
                "기준일ID": "20260501",
                "시간대구분": f"{hour:02d}",
                "행정동코드": "11110530",
                "총생활인구수": 200 if 9 <= hour <= 18 else 100,
            }
            for hour in range(24)
        ],
    )
    region_master = pd.DataFrame({"region_id": ["1111053000"]})

    result = build_population_fact(source, region_master).iloc[0]

    assert result["기준일자"] == "2026-05"
    assert result["주간생활인구"] == 200
    assert result["야간생활인구"] == 100
    assert result["주야간생활인구비율"] == 2
    assert result["생활인구"] == 141.67
    assert pd.isna(result["주민등록인구"])


def test_population_fact_ignores_invalid_hours_and_unknown_regions() -> None:
    source = pd.DataFrame(
        [
            {
                "기준일ID": "20260501",
                "시간대구분": "09",
                "행정동코드": "11110530",
                "총생활인구수": "120",
            },
            {
                "기준일ID": "20260501",
                "시간대구분": "24",
                "행정동코드": "11110530",
                "총생활인구수": "999",
            },
            {
                "기준일ID": "20260501",
                "시간대구분": "09",
                "행정동코드": "99999999",
                "총생활인구수": "999",
            },
        ],
    )
    region_master = pd.DataFrame({"region_id": ["1111053000"]})

    result = build_population_fact(source, region_master)

    assert len(result) == 1
    assert result.iloc[0]["주간생활인구"] == 120
    assert pd.isna(result.iloc[0]["야간생활인구"])
