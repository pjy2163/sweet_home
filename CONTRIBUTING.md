# Contributing

스위트홈은 초기에는 1인 창업자 프로젝트로 운영하지만, 오픈소스 포트폴리오로 확장할 수 있도록 이슈와 PR 기반 흐름을 사용합니다.

## Working Style

1. Issue를 만든다.
2. 담당 Agent를 정한다.
3. 작업 계획을 남긴다.
4. 작은 단위로 구현한다.
5. 검증 결과를 남긴다.
6. PR 또는 작업 브리핑으로 마무리한다.

## Scope

초기 MVP는 서울 행정동 기준 후보 지역 비교입니다.

MVP에 포함:

- 안전
- 비용
- 교통
- 생활 편의
- 환경
- 데이터 출처

MVP에서 제외:

- 매물 추천
- 투자 분석
- 집값 예측
- 전국 확장
- 커뮤니티
- 복잡한 인프라

## Data Rule

- `data/raw/` 원본은 수정하지 않습니다.
- 정제 결과는 `data/processed/`에 둡니다.
- 데이터 출처와 기준일자를 문서에 남깁니다.
- 행정동과 법정동을 섞어 쓰지 않습니다.

## Documentation Rule

작업이 끝나면 다음 중 하나를 업데이트합니다.

- `docs/project-board.md`
- `docs/project-log.md`
- `docs/data-dictionary.md`
- `docs/briefing-*.md`
