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

- `safety_fact` 이름을 우선 사용합니다. 범죄 발생률보다는 안전시설 접근성과 유흥시설 밀도를 함께 보는 지표이기 때문입니다.
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
- SGIS 경계는 센서스용 경계이므로 법정 행정구역 고시 경계와 차이가 있을 수 있습니다. MVP에서는 좌표 공간조인 기준으로 사용하되 한계를 문서화합니다.

## 메모

- 사용자가 요청한 구조에는 `data-inventory.xlsx`가 포함되어 있지만, 초기 버전은 Git diff와 문서 관리가 쉬운 Markdown으로 관리합니다.
- 추후 필요하면 이 문서를 기준으로 xlsx를 생성합니다.
- `real_estate_fact.csv`는 법정동코드를 행정동코드로 매핑해 행정동/월 단위로 집계합니다.
- `real_estate_price_comparison.csv`는 `real_estate_fact.csv`를 기반으로 서울 평균 대비 지역별 전월세 가격 수준을 계산합니다.
- `population_fact.csv`는 서울 열린데이터광장 `행정동 단위 서울 생활인구(내국인)` 데이터를 원천으로 사용하며, 현재 2026-05 기준 생활인구를 집계합니다.
- MVP에서는 우선 `생활인구`를 채우고, `주민등록인구`와 `세대수`는 별도 주민등록 인구 원천을 확보한 뒤 보강합니다.
- safety 원천 검증은 2026-06-14 기준 서울 열린데이터광장 공개 메타데이터를 기준으로 수행했습니다.
