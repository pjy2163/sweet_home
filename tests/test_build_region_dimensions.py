import pandas as pd
import pytest

from src.region.build_dong_mapping import build_dong_mapping
from src.region.build_region_master import build_region_master


def region_source() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "시도명": "서울특별시",
                "시군구명": "중구",
                "행정동코드": "1114052000",
                "행정동명": "과거동",
                "법정동코드": "1114010100",
                "법정동명": "법정가동",
                "개정일자": "2024-01-01",
                "연결번호": "1",
            },
            {
                "시도명": "서울특별시",
                "시군구명": "중구",
                "행정동코드": "1114059000",
                "행정동명": "현재1동",
                "법정동코드": "1114010100",
                "법정동명": "법정가동",
                "개정일자": "2025-04-01",
                "연결번호": "1",
            },
            {
                "시도명": "서울특별시",
                "시군구명": "중구",
                "행정동코드": "1114059000",
                "행정동명": "현재1동",
                "법정동코드": "1114010200",
                "법정동명": "법정나동",
                "개정일자": "2025-04-01",
                "연결번호": "2",
            },
            {
                "시도명": "서울특별시",
                "시군구명": "중구",
                "행정동코드": "1114060000",
                "행정동명": "현재2동",
                "법정동코드": "1114010300",
                "법정동명": "법정다동",
                "개정일자": "2025-04-01",
                "연결번호": "1",
            },
            {
                "시도명": "부산광역시",
                "시군구명": "중구",
                "행정동코드": "2611051000",
                "행정동명": "중앙동",
                "법정동코드": "2611010100",
                "법정동명": "중앙동1가",
                "개정일자": "2025-04-01",
                "연결번호": "1",
            },
        ],
    )


def test_region_master_uses_only_the_latest_source_revision() -> None:
    result = build_region_master(region_source())

    assert result["region_id"].tolist() == ["1114059000", "1114060000"]
    assert result["행정동명"].tolist() == ["현재1동", "현재2동"]
    assert "과거동" not in set(result["행정동명"])


def test_dong_mapping_uses_the_same_latest_revision_grain() -> None:
    result = build_dong_mapping(region_source())

    assert len(result) == 3
    assert result["행정동코드"].nunique() == 2
    assert set(result["개정일자"]) == {"2025-04-01"}
    assert "과거동" not in set(result["행정동명"])


@pytest.mark.parametrize("builder", [build_region_master, build_dong_mapping])
def test_region_builders_reject_sources_without_revision_dates(builder) -> None:
    source = region_source()
    source["개정일자"] = None

    with pytest.raises(ValueError, match="no revision date"):
        builder(source)
