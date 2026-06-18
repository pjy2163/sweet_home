from __future__ import annotations

import argparse
import subprocess
from dataclasses import dataclass


REPO = "pjy2163/sweet_home"


@dataclass(frozen=True)
class Issue:
    title: str
    labels: tuple[str, ...]
    body: str


ISSUES = [
    Issue(
        title="[SH-012] Population Fact 데이터 소스 선정",
        labels=("type: data", "priority: p0", "status: ready", "agent: data-architect"),
        body="""## Background
MVP 비교 리포트에 인구/환경 지표를 넣기 위해 행정동 기준 인구 데이터 소스가 필요합니다.

## Goal
서울 행정동 단위로 사용할 수 있는 Population Fact 원천 데이터를 확정합니다.

## Checklist
- [ ] 후보 데이터 소스 2개 이상 확인
- [ ] 행정동코드 또는 행정동명 제공 여부 확인
- [ ] 업데이트 주기 확인
- [ ] raw 저장 위치 결정
- [ ] data-inventory.md 업데이트

## Expected Output
- 확정 데이터 출처
- raw 파일 또는 API 접근 방식
- docs/data-inventory.md 업데이트
""",
    ),
    Issue(
        title="[SH-014] Safety Fact 데이터 소스 선정",
        labels=("type: data", "priority: p0", "status: ready", "agent: data-architect"),
        body="""## Background
스위트홈 MVP의 핵심 차별점 중 하나는 안전 지표입니다. 다만 직접 범죄 데이터는 행정동 단위 확보가 어려울 수 있습니다.

## Goal
MVP에 넣을 안전 지표의 데이터 소스를 확정합니다.

## Checklist
- [ ] 직접 범죄 데이터의 지역 단위 한계 확인
- [ ] 안전 대체 지표 사용 가능성 확인
- [ ] 유흥시설, CCTV, 안심시설 대체 지표 확인
- [ ] MVP 안전 지표 범위 결정
- [ ] data-inventory.md 업데이트

## Expected Output
- safety 데이터 후보 및 선택 근거
- MVP 안전 지표 설계 방향
""",
    ),
    Issue(
        title="[SH-016] Real Estate Fact 설계",
        labels=("type: data", "priority: p0", "status: ready", "agent: data-architect"),
        body="""## Background
서울 전월세 실거래 데이터는 이미 확보되어 있으며, 첫 번째 실전 fact table로 만들기 좋습니다.

## Goal
real_estate_fact.csv의 컬럼과 집계 기준을 정의합니다.

## Checklist
- [ ] 원본 컬럼 확인
- [ ] 사용할 컬럼 선정
- [ ] 전세/월세 집계 기준 정의
- [ ] 행정동 매핑 정책 정의
- [ ] data-dictionary.md 업데이트

## Expected Output
- real_estate_fact schema
- 집계 기준 문서화
""",
    ),
    Issue(
        title="[SH-017] 서울 전월세 데이터 행정동 매핑",
        labels=("type: data", "priority: p0", "status: ready", "agent: data-architect"),
        body="""## Background
서울 전월세 데이터는 법정동 기준이고, 스위트홈의 기준 지역 단위는 행정동입니다.

## Goal
법정동코드 기반 거래 데이터를 행정동코드로 매핑하고 real_estate_fact 초안을 생성합니다.

## Checklist
- [ ] 법정동코드 포맷 정규화
- [ ] dong_mapping.csv와 join
- [ ] 매핑 실패 행 수 확인
- [ ] 다대다 매핑 케이스 확인
- [ ] 행정동별 거래량/평균 보증금/평균 임대료 집계
- [ ] real_estate_fact.csv 생성

## Expected Output
- data/processed/real_estate_fact.csv
- 매핑 검증 결과
""",
    ),
    Issue(
        title="[SH-018] MVP 비교 리포트 스펙 작성",
        labels=("type: product", "type: design", "priority: p1", "status: ready", "agent: pm"),
        body="""## Background
데이터 파이프라인 결과가 사용자에게 어떤 비교 리포트로 보일지 정의해야 합니다.

## Goal
후보 지역 A/B 비교 리포트의 첫 번째 MVP 스펙을 작성합니다.

## Checklist
- [ ] 비교 리포트 섹션 정의
- [ ] 각 섹션별 필요한 fact table 연결
- [ ] 데이터 출처/기준일 표시 정책 정의
- [ ] 추천처럼 보이지 않는 문장 기준 작성
- [ ] 샘플 리포트 문구 작성

## Expected Output
- docs/report-spec.md
""",
    ),
]


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Create issues on GitHub")
    args = parser.parse_args()

    for issue in ISSUES:
        command = [
            "gh",
            "issue",
            "create",
            "--repo",
            REPO,
            "--title",
            issue.title,
            "--body",
            issue.body,
        ]
        for label in issue.labels:
            command.extend(["--label", label])

        if args.apply:
            run(command)
        else:
            print(" ".join(command[:6]), issue.title)

    if not args.apply:
        print("\nDry run only. Run with --apply after `gh auth login`.")


if __name__ == "__main__":
    main()
