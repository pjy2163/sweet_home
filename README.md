# 스위트홈(SweetHome)

스위트홈은 집을 추천하는 서비스가 아니라, 사용자가 여러 후보지를 비교할 때 객관적인 데이터를 기반으로 의사결정을 내릴 수 있도록 돕는 서비스입니다.

## 프로젝트 비전

사용자가 원하는 질문은 단순합니다.

> 어디가 더 좋은가?

하지만 부동산 의사결정에 필요한 정보는 여러 서비스와 공공데이터에 흩어져 있습니다.

- 호갱노노
- 네이버 부동산
- 부동산지인
- 카카오맵
- 국토교통부 실거래가
- 서울시 안전 관련 공공데이터
- KOSIS
- 서울 열린데이터광장

스위트홈은 흩어진 데이터를 지역 단위로 통합하고, 후보지 간 차이를 비교 가능한 형태로 보여주는 AI 기반 부동산 비교 분석 플랫폼을 지향합니다.

## 서비스 정의

AI 나만의 중개사

사용자가 집을 구할 때 다음 요소를 종합적으로 비교하여 의사결정을 돕습니다.

- 가격
- 교통
- 상권
- 안전 대체 지표
- 인구
- 생활인프라
- 미래가치

초기 MVP의 타겟은 서울에서 월세 또는 전세를 구하는 사회초년생, 1인가구, 독립 예정자입니다.

MVP의 핵심 질문은 다음 하나입니다.

> 후보 지역 A와 B 중 내 생활 조건에 더 적합한 곳은 어디이며, 그 이유는 무엇인가?

첫 번째 MVP는 가격 비교에 집중합니다.

> 이 지역의 전월세 가격은 서울 평균 대비 어느 정도 수준인가?

## 하지 않는 것

- 이 집을 사세요
- 이 아파트가 최고입니다
- 투자 추천

## 하는 것

예를 들어 `문래동 더샵 르프리베`와 `고덕강일 3단지`를 비교할 때 다음 정보를 함께 제공합니다.

- 출퇴근 시간
- 실거래가
- 전세가율
- 생활인구
- 안전 대체 지표
- 상권
- 학군
- 인구구조

최종 결정은 사용자가 합니다.

## 핵심 가치

집을 추천하는 것이 아니라, 집을 비교하여 데이터 기반 의사결정을 돕습니다.

장기적으로는 "어디가 더 좋은가?"가 아니라 "나에게 무엇이 더 적합한가?"를 데이터로 설명하는 서비스를 목표로 합니다.

## 현재 데이터 전략

모든 데이터를 지역 단위로 통합합니다.

- 기준 지역 단위: 행정동
- 공통 Key: `region_id = 행정동코드`

## 확보한 데이터

### 법정동 코드 데이터

용도: 법정동 마스터 구축

- 법정동코드
- 시도명
- 자치구명
- 법정동명

### 법정동 연계정보

용도: 행정동과 법정동 매핑

- 시도명
- 시군구명
- 행정동명
- 법정동명
- 행정구역코드
- 행정동코드
- 법정동코드
- 개정일자
- 연결번호

## 생성 예정 테이블

### region_master

모든 데이터의 기준 지역 테이블입니다.

- region_id
- 시도명
- 시군구명
- 행정동코드
- 행정동명

`region_id = 행정동코드`

### dong_mapping

법정동과 행정동을 연결하는 매핑 테이블입니다.

- 행정동코드
- 행정동명
- 법정동코드
- 법정동명

## 데이터 레이어

### 1. 부동산

`real_estate_fact`

- 실거래가
- 전세가
- 전세가율
- 거래량

### 2. 인구

`population_fact`

- 주민등록인구
- 생활인구
- 연령대
- 세대수

### 3. 안전

`safety_fact`

- 안심시설수
- 유흥시설수
- CCTV수
- 경찰시설수

초기 MVP에서는 범죄율을 직접 사용하기보다 행정동 매핑이 가능한 안전 대체 지표를 우선 사용합니다.

### 4. 생활인프라

`infrastructure_fact`

- 병원
- 학교
- 지하철
- 버스
- 공원

### 5. 상권

`commercial_fact`

- 카드매출
- 업종수
- 사업체수
- 경쟁도

상권은 메인이 아니라 비교 요소 중 하나입니다.

## 비교 리포트 예시

`문래동 더샵 르프리베` vs `고덕강일 3단지`

- 가격: 서울 평균 대비 전세가/보증금 수준 비교
- 거래량: 가격 해석에 필요한 시장 참고성 비교
- 교통: 문래 우세
- 안전: 고덕 우세
- 생활인프라: 문래 우세
- 상권: 문래 우세
- 주거환경: 고덕 우세

최종 판단 예시:

- 문래는 직주근접형
- 고덕은 가족 거주형

## 현재 진행 상황

- 데이터 인벤토리 완료
- 행정동 기준 데이터 모델 확정
- 법정동과 행정동 매핑 데이터 확보
- Region Master 설계 완료
- 서울 전월세 실거래 데이터를 행정동/월 단위 `real_estate_fact.csv`로 집계 완료
- 서울 평균 대비 지역별 전월세 가격 비교용 `real_estate_price_comparison.csv` 생성 완료
- 후보 지역 2개의 서울 평균 대비 가격 수준을 출력하는 MVP 리포트 생성기 구현
- 서울 생활인구 원천 데이터 소스 확정
- 서울 생활인구 데이터를 행정동/월 단위 `population_fact.csv`로 집계 완료
- 안전 지표는 `safety_fact` 기준으로 원천 확보 전 ETL 골격 구축 완료

## MVP 리포트 실행

가격 비교 MVP 리포트는 `real_estate_price_comparison.csv` 데이터 마트를 읽어 후보 행정동 2개의 가격 수준을 비교합니다.

```bash
.venv/bin/python src/report/generate_report.py --a 개포1동 --b 개포2동
```

구 이름까지 지정해야 하는 경우 다음처럼 입력합니다.

```bash
.venv/bin/python src/report/generate_report.py --a "강남구 개포1동" --b "강남구 개포2동"
```

특정 계약월을 지정할 수도 있습니다.

```bash
.venv/bin/python src/report/generate_report.py --a 개포1동 --b 개포2동 --month 2025-12
```

## 다음 단계

1. MVP 리포트 문구와 예외 케이스 정리
2. 가격 비교 리포트에 생활인구 지표 연결
3. `safety_fact.csv` 안전 대체 지표 구축
4. `commercial_fact.csv` 구축

- Python과 SQL 기반 분석
- 비교 리포트용 데이터 마트 구성

## 문서

- [Product Clarity](docs/product-clarity.md)
- [MVP Report Spec](docs/report-spec.md)
- [Public Project Summary](docs/public-project-summary.md)
- [Data Dictionary](docs/data-dictionary.md)
- [Data Inventory](docs/data-inventory.md)

내부 운영 문서, 에이전트 문서, 원본 기획서, 작업 보드는 공개 저장소에 포함하지 않습니다.

## 실행 방법

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

python src/region/build_region_master.py
python src/region/build_dong_mapping.py
```

## 공개 전 보안 점검

```bash
python scripts/security_scan.py
git status --short --ignored
```

## GitHub 이슈 생성

GitHub CLI 인증 후 P0/P1 작업 이슈를 생성할 수 있습니다.

```bash
gh auth login -h github.com
python scripts/create_github_issues.py --apply
```
