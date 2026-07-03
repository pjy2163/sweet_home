# API Spec

SweetHome API는 서울 행정동 비교 MVP를 웹 화면에서 사용할 수 있도록 제공하는 FastAPI 기반 읽기 전용 API입니다.

API는 `data/processed/region_comparison_snapshot.csv`를 조회해 지역 목록, 데이터 기준, 후보 지역 비교 결과를 반환합니다.

## 실행

```bash
.venv/bin/uvicorn src.api.main:app --reload
```

기본 접속 주소:

```text
http://127.0.0.1:8000
```

자동 API 문서:

```text
http://127.0.0.1:8000/docs
```

OpenAPI JSON:

```text
http://127.0.0.1:8000/openapi.json
```

## Endpoints

### `GET /health`

API 서버 상태를 확인합니다.

응답 예시:

```json
{
  "status": "ok",
  "service": "sweethome-api"
}
```

### `GET /regions`

비교 후보로 선택할 수 있는 서울 행정동 목록을 반환합니다.

응답 예시:

```json
[
  {
    "region_id": "1168066000",
    "gu_name": "강남구",
    "dong_name": "개포1동",
    "display_name": "강남구 개포1동"
  }
]
```

### `GET /metadata`

API가 사용하는 데이터 출처, 집계 기준, 한계, 최신 기준월/기준일을 반환합니다.

응답 예시:

```json
{
  "source": "서울 전월세 실거래, 생활인구, 안전 대체 지표, 상권 점포 데이터 기반",
  "aggregation": "행정동 기준 최신 snapshot mart",
  "limitation": "도메인별 기준일자가 다를 수 있으며, 안전 지표는 범죄율이 아니라 안전 대체 지표입니다. 가격 지표는 법정동-행정동 매핑 영향으로 인접 행정동이 같은 값을 가질 수 있습니다. 상권 지표는 매출이나 투자성을 뜻하지 않습니다.",
  "region_count": 433,
  "price_latest_month": "2026-02",
  "population_latest_month": "2026-05",
  "safety_latest_date": "안심시설수 2023-04-21; 유흥시설수 2026-06-17",
  "commercial_latest_quarter": "20254"
}
```

### `GET /compare`

두 후보 행정동의 비교 결과를 반환합니다.

Query parameters:

| 이름 | 필수 | 설명 |
| --- | --- | --- |
| `a` | 예 | 첫 번째 후보 행정동명. 예: `개포1동` 또는 `강남구 개포1동` |
| `b` | 예 | 두 번째 후보 행정동명. 예: `개포4동` 또는 `강남구 개포4동` |

요청 예시:

```text
GET /compare?a=개포1동&b=개포4동
```

응답 주요 필드:

| 필드 | 설명 |
| --- | --- |
| `region_a` | 첫 번째 후보 지역의 가격, 생활인구, 안전 대체, 상권 지표 |
| `region_b` | 두 번째 후보 지역의 가격, 생활인구, 안전 대체, 상권 지표 |
| `summary` | 비교 해석 문장 목록 |
| `data_basis` | 데이터 기준과 한계 문장 목록 |
| `report_text` | CLI 리포트와 일관된 텍스트 리포트 |

## Future Endpoint Direction

### `GET /explore`

후보지를 모르는 사용자를 위한 지도 기반 후보지 탐색 API로 확장할 수 있습니다.

이 API는 SweetHome이 중요도를 결정하지 않습니다. 사용자가 조건별 가중치를 입력하면 API는 기본 도메인 점수에 해당 가중치를 적용해 행정동 목록을 다시 정렬합니다.

예상 query parameters:

| 이름 | 설명 |
| --- | --- |
| `safety` | 안전 대체 지표 중요도 |
| `convenience` | 생활 편의/상권 중요도 |
| `transport` | 교통 접근성 중요도 |
| `price` | 비용 중요도 |
| `population` | 생활인구/환경 중요도 |

예상 응답 방향:

```json
{
  "weights": {
    "safety": 40,
    "convenience": 30,
    "transport": 20,
    "price": 10,
    "population": 0
  },
  "regions": [
    {
      "region_id": "1168066000",
      "display_name": "강남구 개포1동",
      "weighted_score": 78.4,
      "score_breakdown": {
        "safety": 65.2,
        "convenience": 81.1,
        "transport": null,
        "price": 55.0,
        "population": 70.5
      }
    }
  ]
}
```

`weighted_score`는 사용자가 입력한 현재 가중치 기준의 상대적 적합도입니다. API는 "추천", "최고", "안전", "위험" 같은 결론을 반환하지 않습니다.

## Error Response

API 도메인 오류는 공통 형식을 사용합니다.

```json
{
  "code": "REGION_NOT_FOUND",
  "message": "지역을 찾을 수 없습니다: 없는동"
}
```

현재 에러 코드:

| HTTP status | code | 설명 |
| --- | --- | --- |
| `404` | `REGION_NOT_FOUND` | 입력한 행정동명을 찾을 수 없음 |
| `400` | `REGION_AMBIGUOUS` | 같은 행정동명이 여러 구에 있어 구 이름 입력이 필요함 |

## Product Boundary

API는 후보 지역 비교를 위한 참고 정보를 제공합니다.

API는 다음을 제공하지 않습니다.

- 특정 집 또는 지역 선택 추천
- 고정된 서비스 기본 추천 순위
- 투자 판단
- 안전 또는 위험 단정
- 가격 상승 예측

안전 지표는 범죄율이 아니라 안전 대체 지표이며, 상권 지표는 매출이나 수익성을 뜻하지 않습니다.

탐색 점수는 사용자가 정한 가중치를 적용한 계산 결과입니다. SweetHome은 어떤 조건이 더 중요하다고 결정하지 않습니다.

## Verification

API 테스트:

```bash
.venv/bin/python -m pytest tests/test_api_health.py tests/test_api_regions.py tests/test_api_metadata.py tests/test_api_compare.py
```

보안 점검:

```bash
.venv/bin/python scripts/security_scan.py
```

CLI 비교 리포트 호환 확인:

```bash
.venv/bin/python src/report/generate_report.py --a 개포1동 --b 개포4동
```
