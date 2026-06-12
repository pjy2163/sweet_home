# Data Inventory

| 구분 | 파일 | 상태 | 인코딩 | 용도 |
| --- | --- | --- | --- | --- |
| region | 법정동코드 조회자료.xlsx | 확보 | xlsx | 법정동 코드 확인 |
| region | 국가데이터처_법정동 연계정보_20250602.csv | 확보 | cp949 | 행정동과 법정동 매핑 |
| real_estate | seoul_month_2025.csv | fact 생성 완료 | cp949 | 서울 전월세 실거래 데이터 |
| population | LOCAL_PEOPLE_DONG_202605.csv | fact 생성 완료 | utf-8-sig | 서울 열린데이터광장 행정동 단위 서울 생활인구(내국인) |

## 메모

- 사용자가 요청한 구조에는 `data-inventory.xlsx`가 포함되어 있지만, 초기 버전은 Git diff와 문서 관리가 쉬운 Markdown으로 관리합니다.
- 추후 필요하면 이 문서를 기준으로 xlsx를 생성합니다.
- `real_estate_fact.csv`는 법정동코드를 행정동코드로 매핑해 행정동/월 단위로 집계합니다.
- `real_estate_price_comparison.csv`는 `real_estate_fact.csv`를 기반으로 서울 평균 대비 지역별 전월세 가격 수준을 계산합니다.
- `population_fact.csv`는 서울 열린데이터광장 `행정동 단위 서울 생활인구(내국인)` 데이터를 원천으로 사용하며, 현재 2026-05 기준 생활인구를 집계합니다.
- MVP에서는 우선 `생활인구`를 채우고, `주민등록인구`와 `세대수`는 별도 주민등록 인구 원천을 확보한 뒤 보강합니다.
