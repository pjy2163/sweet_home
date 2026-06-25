# Data Inventory

| 구분 | 파일 | 상태 | 인코딩 | 용도 |
| --- | --- | --- | --- | --- |
| region | 법정동코드 조회자료.xlsx | 확보 | xlsx | 법정동 코드 확인 |
| region | 국가데이터처_법정동 연계정보_20250602.csv | 확보 | cp949 | 행정동과 법정동 매핑 |
| real_estate | seoul_month_2025.csv | fact 생성 완료 | cp949 | 서울 전월세 실거래 데이터 |
| population | LOCAL_PEOPLE_DONG_202605.csv | fact 생성 완료 | utf-8-sig | 서울 열린데이터광장 행정동 단위 서울 생활인구(내국인) |
| boundary | SGIS 센서스용 행정구역 경계 | 후보 검증 완료 | SHP | 행정동 좌표 공간조인용 경계 polygon |
| safety | 서울시 안심택배함 설치 장소 | 후보 검증 완료 | Open API/Sheet | 주소 기반 안심시설 위치 지표 후보 |
| safety | 서울시 안심귀갓길 서비스 | 후보 검증 완료 | Open API/Sheet/File | 안심귀갓길 및 인근 안전시설물 위치 지표 후보 |
| safety | 서울시 유흥주점영업 인허가 정보 | 후보 검증 완료 | Open API/Sheet | 주소/TM 좌표 기반 유흥시설 밀도 지표 후보 |
| safety | 서울시 단란주점영업 인허가 정보 | 후보 검증 완료 | Open API/Sheet | 주소/TM 좌표 기반 유흥시설 밀도 지표 후보 |
| safety | 서울시 자치구 CCTV 설치현황 | 보조 후보 | xlsx | 자치구 단위 CCTV 현황. 행정동 MVP에는 직접 사용 약함 |
| commercial | 서울시 상권분석서비스(점포-행정동) | fact 생성 완료 | cp949 | 행정동 기준 점포수, 업종수 지표 |

## Region 데이터 정합성

법정동 연계정보 원천은 과거 개정 이력을 포함합니다.
강북구 `번1동`, `번2동`, `번3동`, `수유1동`, `수유2동`, `수유3동`은 2018-10-01까지 사용된 과거 행정동코드와 2019-01-01 이후 사용된 현재 행정동코드가 함께 존재했습니다.

MVP의 `region_master`와 `dong_mapping`은 현재 분석 기준을 유지하기 위해 `시도명 + 시군구명 + 행정동명` 기준 최신 `개정일자` 행을 사용합니다.
2026-06-21 검증 결과 `region_master`는 433개 서울 행정동을 포함하며, 중복 `region_id`와 중복 행정동명은 0건입니다.
재생성된 `real_estate_fact`, `real_estate_price_comparison`, `population_fact`, `safety_fact`는 모두 `region_master.region_id` 참조 무결성 검증을 통과했습니다.

## Safety 데이터 소스 검증

Issue #2에서는 범죄율을 바로 쓰기보다 행정동으로 매핑 가능한 안전 대체 지표를 우선 검토합니다.
검증 기준은 `행정동코드 직접 제공 > 주소/좌표 기반 행정동 매핑 가능 > 자치구 단위만 제공` 순서입니다.

| 후보 | 공식 데이터셋 | 공식 URL | 지역/위치 단위 | 행정동 매핑 가능성 | MVP 판단 |
| --- | --- | --- | --- | --- | --- |
| 안심택배함 | 서울시 안심택배함 설치 장소 | https://data.seoul.go.kr/dataList/OA-20922/S/1/datasetView.do | 설치장소, 주소 | 높음. 주소를 지오코딩하거나 행정동 경계와 결합 | 1순위 안전시설 지표 |
| 안심귀갓길/안심시설 | 서울시 안심귀갓길 서비스 | https://data.seoul.go.kr/dataList/OA-21697/S/1/datasetView.do | 안심귀갓길, 안심택배함, 지킴이집 등 안전시설물 | 높음. SHP/Open API 기반 공간 매핑 가능 | 1순위 안전시설 지표 |
| 유흥주점 | 서울시 유흥주점영업 인허가 정보 | https://data.seoul.go.kr/dataList/OA-16090/S/1/datasetView.do | 소재지, 중부원점TM 좌표 | 높음. 좌표계 변환 후 행정동 경계 매핑 가능 | 1순위 위험/주의 대체 지표 |
| 단란주점 | 서울시 단란주점영업 인허가 정보 | https://data.seoul.go.kr/dataList/OA-16089/S/1/datasetView.do | 소재지, 중부원점TM 좌표 | 높음. 좌표계 변환 후 행정동 경계 매핑 가능 | 1순위 위험/주의 대체 지표 |
| CCTV | 서울시 자치구 연도별/목적별/지능형 CCTV 설치현황 | https://data.seoul.go.kr/dataList/OA-2734/F/1/datasetView.do | 자치구 집계 | 낮음. 행정동 배분 근거가 부족 | MVP 직접 지표 제외, 자치구 보조 설명 후보 |
| 경찰서/지구대/파출소 | 서울 열린데이터광장 직접 검색 결과 없음 | - | 미확정 | 미확정 | MVP 제외, 별도 공식 위치 원천 재탐색 필요 |
| 범죄율/성범죄/강력범죄 | 행정동 단위 공식 공개 원천 미확정 | - | 대체로 경찰서/자치구 단위 가능성 | 낮음 | MVP 제외. 낙인/해석 리스크가 커 대체 지표 우선 |

### MVP 선택 방향

- `safety_fact` 이름을 사용합니다. 범죄 발생률보다는 안전시설 접근성과 유흥시설 밀도를 함께 보는 지표이기 때문입니다.
- 1차 MVP 지표는 행정동/월 또는 행정동/기준일 단위로 `안심시설수`, `유흥시설수`, `CCTV수`를 담되, `CCTV수`는 자치구 단위만 확보될 경우 비워두거나 보조 지표로 분리합니다.
- 안심시설은 `안심택배함 설치 장소`와 `안심귀갓길 서비스`를 결합 후보로 둡니다. 중복 시설물은 원천별 ID 또는 시설명/주소 기준으로 제거합니다.
- 유흥시설은 `유흥주점영업`과 `단란주점영업` 인허가 정보를 결합하되, 영업상태가 정상인 건만 집계합니다.
- 주소만 있는 원천은 지오코딩 후 행정동 경계에 매핑하고, TM 좌표가 있는 원천은 좌표계를 변환한 뒤 행정동 경계에 매핑합니다.

### Safety Fact MVP 입력 계약

`src/safety/build_safety_fact.py`는 초기 MVP에서 행정동 매핑이 끝난 CSV를 입력으로 사용합니다.
주소 지오코딩 또는 좌표 공간조인은 별도 단계로 분리하고, 이 빌더는 `region_id` 또는 `행정동코드`가 있는 중간 산출물을 집계합니다.
`src/safety/prepare_safety_inputs.py`는 행정동 매핑이 완료된 CSV/XLSX를 표준 중간 CSV로 정리하고, `매핑방법`과 `데이터출처`를 함께 보존합니다.
`src/safety/map_safety_coordinates.py`는 TM 좌표가 있는 원천을 행정동 경계와 공간조인해 위 중간 CSV 계약에 맞추는 전처리 CLI입니다.
공간조인 실행에는 행정동 경계 파일과 `geopandas`, `pyproj`, `shapely` 의존성 검증이 필요합니다.

예상 raw 경로는 `data/raw/safety/`이며 git에는 올리지 않습니다.

| source_type | 파일명 패턴 | 필수 지역 컬럼 | 기준일자 처리 | 메타데이터 |
| --- | --- | --- | --- | --- |
| safe_facility | `safe_facilities_*.csv`, `safety_facilities_*.csv`, `safe_parcel_locker_*.csv`, `safe_return_home_*.csv` | `region_id` 또는 `행정동코드` | 날짜 컬럼 또는 파일명의 `YYYYMM`/`YYYYMMDD` | `매핑방법`, `데이터출처` |
| nightlife | `nightlife_facilities_*.csv`, `entertainment_bar_*.csv`, `danran_bar_*.csv` | `region_id` 또는 `행정동코드` | 날짜 컬럼 또는 파일명의 `YYYYMM`/`YYYYMMDD` | `매핑방법`, `데이터출처` |

주소/좌표만 있는 공식 원천은 바로 fact로 집계하지 않고, 행정동 매핑 검증 후 위 입력 계약에 맞춘 중간 CSV로 변환합니다.
중간 CSV는 시설 1개를 1 row로 유지해야 합니다. 같은 `region_id`와 `기준일자`에 여러 시설이 있더라도 중복 제거로 합치지 않고, `build_safety_fact.py`에서 row 수를 집계합니다.

### Safety 원천 컬럼/위치정보 검증

2026-06-15 기준 서울 열린데이터광장 공식 메타데이터에서 확인한 입력 특성입니다.

| 원천 | 확인된 위치/컬럼 단서 | 바로 fact 입력 가능 여부 | 전처리 판단 |
| --- | --- | --- | --- |
| 서울시 안심택배함 설치 장소 | 설치장소와 주소 제공 | 불가 | 주소 지오코딩 또는 주소-행정동 매핑 후 `safe_facility` 중간 CSV 생성 |
| 서울시 안심귀갓길 서비스 | 안심귀갓길, 안심택배함, 지킴이집 등 안전시설물. SHP 통합데이터 제공 | 불가 | SHP를 행정동 경계와 공간조인한 뒤 `safe_facility` 중간 CSV 생성 |
| 서울시 유흥주점영업 인허가 정보 | 소재지와 중부원점TM(EPSG:5174) 좌표 제공. 위경도 좌표는 미제공. 3일 전 자료 제공 | 불가 | `map_safety_coordinates.py`로 TM 좌표를 행정동 경계와 공간조인하고 영업 중 상태만 `nightlife` 중간 CSV로 변환 |
| 서울시 단란주점영업 인허가 정보 | 소재지와 중부원점TM(EPSG:5174) 좌표 제공. 위경도 좌표는 미제공. 3일 전 자료 제공 | 불가 | `map_safety_coordinates.py`로 TM 좌표를 행정동 경계와 공간조인하고 영업 중 상태만 `nightlife` 중간 CSV로 변환 |

따라서 다음 구현 단위는 공식 원천을 바로 `safety_fact`에 넣는 것이 아니라, raw 원천을 검사하고 행정동 매핑 전 중간 CSV 계약에 맞추는 전처리 단계입니다.

raw CSV/XLSX/ZIP을 내려받은 뒤에는 `src/safety/inspect_safety_sources.py`로 인코딩, 시트, 행 수, 컬럼 수, `region_id`/기준일자/영업상태 후보 컬럼을 먼저 확인합니다.
ZIP 원천은 내부 CSV/XLSX 멤버와 SHP 구성 파일 포함 여부를 확인한 뒤, 행정동 매핑 전처리 방식이 주소 기반인지 공간조인 기반인지 결정합니다.
검사 도구는 `safe_facility`와 `nightlife` 입력 패턴별 파일 수를 먼저 출력하므로, 안심시설 원천 누락 여부를 fact 생성 전에 확인할 수 있습니다.

### 행정동 경계 데이터 검증

2026-06-17 기준 SGIS 통계지리정보서비스 자료제공 목록에서 확인한 공간조인 후보입니다.

| 후보 | 공식 URL | 제공 단위 | 형식 | 좌표계 | MVP 판단 |
| --- | --- | --- | --- | --- | --- |
| SGIS 센서스용 행정구역 경계 | https://sgis.kostat.go.kr/view/pss/openDataIntrcn | 전체, 시도, 시군구, 읍면동. 2001~2025년 연 단위 | SHP | UTM-K(GRS80), EPSG:5179 | 1순위. 서울 읍면동 경계만 필터링해 좌표 공간조인 기준 polygon으로 사용 |

사용 판단:

- safety 인허가 원천의 중부원점TM(EPSG:5174) 좌표를 SGIS 행정동 경계 좌표계(EPSG:5179)로 변환한 뒤 공간조인합니다.
- 원천 파일은 `data/raw/boundary/` 또는 `data/raw/safety/boundary/`에 보관하고 git에는 올리지 않습니다.
- 실제 파일 확보 후 `src/safety/inspect_boundary_source.py`로 ZIP/SHP 구성 파일 완전성, 경계 컬럼명, 서울 행정동 수, `region_master.region_id` 매칭률, CRS 메타데이터를 검증합니다.
- SGIS boundary 파일을 `data/raw/boundary/` 아래에 하나만 둘 경우 `.venv/bin/python src/safety/inspect_boundary_source.py`로 기본 검사를 실행합니다. 여러 파일이 있으면 `--input`으로 검사 대상을 명시합니다.
- 2026-06-18 기준 synthetic polygon/point 데이터로 `geopandas`, `pyproj`, `shapely` 의존성과 좌표 공간조인 흐름을 검증했습니다. `map_safety_coordinates.py`는 입력 행 수, 매핑 성공 행 수, 미매핑 행 수, 출력 행 수를 리포트합니다.
- `src/safety/prepare_boundary_source.py`는 boundary 원천을 `region_master.region_id` 기준으로 필터링하고 정규화한 prepared boundary를 생성합니다. 생성된 boundary 파일은 raw/로컬 산출물로 관리하고 git에는 올리지 않습니다.
- SGIS 행정동 경계의 `ADM_CD`는 SweetHome의 행정안전부 10자리 `region_id`와 직접 같은 코드체계가 아니므로, SGIS ZIP 내부 `3. 코드집/1. 행정구역 코드(adm_code).xlsx`를 사용해 `시군구명 + 읍면동명` 기준으로 `region_master`에 매핑합니다.
- `scripts/verify_safety_spatial_pipeline.py`는 synthetic 데이터로 boundary prepare와 coordinate mapping을 한 번에 검증합니다.
- `scripts/run_safety_spatial_pipeline.py`는 실제 boundary 파일과 좌표 원천을 받아 prepared boundary 생성과 coordinate mapping을 한 번에 실행합니다. 출력은 기본적으로 `/private/tmp/sweethome_safety_spatial_pipeline` 아래에 생성하며, mapped CSV 파일명은 `build_safety_fact.py` 입력 패턴과 호환됩니다.
- SGIS 경계는 센서스용 경계이므로 법정 행정구역 고시 경계와 차이가 있을 수 있습니다. MVP에서는 좌표 공간조인 기준으로 사용하되 한계를 문서화합니다.

### Safety 실데이터 공간조인 검증

2026-06-21 기준 실제 SGIS boundary와 서울시 인허가 CSV를 사용해 1차 `safety_fact`를 생성했습니다.

| 원천 | 전체 row | 영업 중 + 유효좌표 row | 공간조인 매핑 row | 미매핑 row |
| --- | ---: | ---: | ---: | ---: |
| 서울시 유흥주점영업 인허가 정보 | 4,985 | 1,686 | 1,637 | 49 |
| 서울시 단란주점영업 인허가 정보 | 11,614 | 1,857 | 1,790 | 67 |

SGIS boundary는 전국 행정동 3,559개 중 `region_master`와 이름 기준으로 매핑 가능한 서울 행정동 426개를 사용했습니다.

생성된 `safety_fact.csv`는 2026-06-17 기준 433개 `region_id` 행을 가지며, 총 `유흥시설수`는 3,427건입니다. `region_id + 기준일자` 중복 key는 0건이고 key null도 0건입니다.

2026-06-25 기준 `src/safety/inspect_safety_sources.py`로 raw availability를 재검증하고, 서울시 안심귀갓길 안전시설물 SHP를 행정동 경계와 공간조인했습니다.

| 원천 | 전체 row | 집계 대상 row | 공간조인 매핑 row | 미매핑 row | 기준일자 |
| --- | ---: | ---: | ---: | ---: | --- |
| 서울시 안심귀갓길 안전시설물 | 11,883 | 11,883 | 11,427 | 456 | 2023-04-21 |
| 서울시 유흥주점영업/단란주점영업 인허가 정보 | 16,599 | 3,543 | 3,427 | 116 | 2026-06-17 |

재생성된 `safety_fact.csv`는 433개 행정동과 2개 안전 기준일을 포함해 866행입니다.
총 `안심시설수`는 11,427건, 총 `유흥시설수`는 3,427건이며, `region_id + 기준일자` 중복 key는 0건입니다.
안심시설 원천은 기준일자가 2023-04-21로 오래되었으므로 최신 시설 현황이 아니라 공개 데이터 기반 생활환경 참고 지표로 사용합니다.

## Region Comparison Snapshot

2026-06-25 기준 `region_master`, `real_estate_price_comparison`, `population_fact`, `safety_fact`, `commercial_fact`를 결합해 `data/processed/region_comparison_snapshot.csv`를 생성했습니다.

mart grain은 `region_id` 1행이며, API/CLI/웹에서 지역별 최신 MVP 지표를 바로 조회하기 위한 read model입니다.
가격, 생활인구, 안전 지표는 원천 갱신 주기가 다르므로 `가격_기준월`, `생활인구_기준월`, `안전_기준일자`를 별도 컬럼으로 보존합니다.
안전 지표는 `안심시설수`와 `유흥시설수`의 최신 기준일이 다를 수 있어 snapshot에서 지표별 최신 기준일을 함께 표시합니다.
상권 지표는 `상권_기준일자`, `업종수`, `사업체수`, `상권_데이터여부`를 포함합니다.

검증 결과:

- output rows: 433
- unique `region_id`: 433
- duplicate `region_id`: 0
- null `region_id`: 0
- price missing rows: 0
- population missing rows: 15
- safety missing rows: 0
- commercial missing rows: 0
- price latest month: 2026-02
- population latest month: 2026-05
- safety latest date: `안심시설수 2023-04-21; 유흥시설수 2026-06-17`
- commercial latest quarter: `20254`

## Commercial 데이터 소스 검토

Issue #14에서는 상권/생활편의 지표를 행정동 단위로 정규화할 수 있는 원천을 우선 검토합니다.
2026-06-25 기준 서울시 상권분석서비스(점포-행정동) 2025년 CSV를 사용해 `commercial_fact.csv`를 생성했습니다.

검증 기준은 다음 순서입니다.

1. 행정동코드 또는 행정동 단위 집계가 직접 제공되는 원천
2. 주소 또는 좌표가 있어 행정동 경계로 매핑 가능한 원천
3. 자치구 단위만 제공되는 원천

MVP에서는 매출 규모를 단정적으로 비교하기보다, 사용자가 생활편의와 상권 밀도를 참고할 수 있는 지표를 우선합니다.
매출 데이터는 업종/기간/카드사 표본에 따라 해석 리스크가 있으므로, 기준일자와 집계 단위를 명확히 확인한 뒤 사용합니다.

### Commercial Fact MVP 입력 계약

상권 raw 파일은 `data/raw/commercial/` 아래에 보관하고 git에는 올리지 않습니다.
raw를 내려받은 뒤에는 `src/commercial/inspect_commercial_sources.py`로 인코딩, 행 수, 시트, 지역/기준일자/지표 후보 컬럼을 먼저 확인합니다.

| source_group | 파일명 패턴 | 우선 컬럼 | 후보 지표 |
| --- | --- | --- | --- |
| store | `commercial_store_*.csv`, `store_count_*.csv`, `business_count_*.csv`, `*점포-행정동*.csv` | `region_id`, `행정동코드`, `행정동_코드` | `점포수`, `업종수`, `사업체수` |
| sales | `commercial_sales_*.csv`, `card_sales_*.csv`, `estimated_sales_*.csv`, `*추정매출-행정동*.csv` | `region_id`, `행정동코드`, `행정동_코드` | `카드매출`, `매출금액`, `당월_매출_금액` |
| facility | `convenience_facilities_*.csv`, `living_facilities_*.csv` | `region_id`, `행정동코드`, 주소 또는 좌표 | `시설수`, 업종별 시설 수 |

초기 `commercial_fact`는 시설 또는 점포 1개 row를 그대로 서비스에 노출하지 않고, 행정동/기준일 단위로 집계한 fact로 관리합니다.
상권 지표가 `region_comparison_snapshot`에 들어갈 때는 가격/생활인구/안전과 동일하게 기준일자와 데이터 존재 여부를 함께 표시합니다.

### Commercial Fact 생성 검증

서울시 상권분석서비스(점포-행정동) 원천은 `행정동_코드`를 8자리로 제공합니다.
SweetHome의 `region_id`는 10자리 행정동코드이므로, 뒤에 `00`을 붙여 정규화합니다.

검증 결과:

- source rows: 141,218
- quarters: `20251`, `20252`, `20253`, `20254`
- latest quarter: `20254`
- latest quarter rows: 35,317
- matched rows: 35,317
- unmatched rows after region validation: 0
- output rows: 433
- total stores: 580,341
- regions with stores: 425

`업종수`는 행정동별 `서비스_업종_코드` distinct count로 계산합니다.
`사업체수`는 행정동별 `점포_수` 합계로 계산합니다.
추정매출 원천은 확보했지만, 매출 데이터는 표본/업종/기간 해석 리스크가 있어 현재 `commercial_fact.카드매출`에는 반영하지 않습니다.

## 메모

- 사용자가 요청한 구조에는 `data-inventory.xlsx`가 포함되어 있지만, 초기 버전은 Git diff와 문서 관리가 쉬운 Markdown으로 관리합니다.
- 추후 필요하면 이 문서를 기준으로 xlsx를 생성합니다.
- `real_estate_fact.csv`는 법정동코드를 행정동코드로 매핑해 행정동/월 단위로 집계합니다.
- `real_estate_price_comparison.csv`는 `real_estate_fact.csv`를 기반으로 서울 평균 대비 지역별 전월세 가격 수준을 계산합니다.
- `population_fact.csv`는 서울 열린데이터광장 `행정동 단위 서울 생활인구(내국인)` 데이터를 원천으로 사용하며, 현재 2026-05 기준 생활인구를 집계합니다.
- MVP에서는 우선 `생활인구`를 채우고, `주민등록인구`와 `세대수`는 별도 주민등록 인구 원천을 확보한 뒤 보강합니다.
- safety 원천 검증은 2026-06-14 기준 서울 열린데이터광장 공개 메타데이터를 기준으로 수행했습니다.
