from __future__ import annotations

import json
import os
import re
import time
import uuid
from typing import Callable, Optional, Union

import httpx
from pydantic import ValidationError

from src.ai_report.contracts import (
    AIReportContent,
    AIReportEvidencePack,
    AIReportPreviewRequest,
    AIReportResponse,
    AIReportSection,
)
from src.ai_report.evidence import build_evidence_pack


DEFAULT_MODEL = "gpt-5.4-mini"
PROMPT_VERSION = "ai-report-beta-v1"
OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
NUMBER_PATTERN = re.compile(r"\d")
PROHIBITED_PHRASES = ("선택하세요", "추천합니다", "투자", "안전한 지역", "위험한 지역")


def fallback_report(evidence: AIReportEvidencePack) -> AIReportContent:
    domain_labels = {
        "price": "가격과 표본",
        "population": "생활인구",
        "safety": "안전 대체 지표",
        "convenience": "생활 편의",
    }
    priorities = evidence.request.priorities or ["price", "population", "convenience"]
    sections: list[AIReportSection] = []
    for domain in priorities:
        metrics = [metric for metric in evidence.metrics if metric.domain == domain]
        usable = [metric for metric in metrics if metric.value is not None]
        statuses = {metric.quality_status for metric in metrics}
        if not usable:
            analysis = "두 후보를 함께 해석할 수 있는 관측값이 부족합니다. 결측 여부를 먼저 확인해야 합니다."
        elif "caution" in statuses or "missing" in statuses:
            analysis = "후보 간 차이는 관측되지만 표본이나 기준일의 제한이 있어 방향만 참고해야 합니다."
        else:
            analysis = "두 후보의 관측 차이는 비교표에서 확인할 수 있으며 생활 조건과 함께 해석해야 합니다."
        sections.append(
            AIReportSection(
                heading=domain_labels[domain],
                analysis=analysis,
                evidence_ids=[metric.evidence_id for metric in usable[:6]]
                or [metrics[0].evidence_id],
            )
        )

    cautions = [flag.message for flag in evidence.quality_flags]
    if not cautions:
        cautions = ["공개 데이터의 기준일과 행정동 매핑 한계를 함께 확인해야 합니다."]
    return AIReportContent(
        executive_summary=(
            "두 후보 지역은 하나의 점수로 순위를 정하지 않고 가격, 생활인구와 생활환경 근거를 "
            "나누어 비교했습니다."
        ),
        sections=sections,
        cautions=cautions[:8],
        next_checks=[
            "실제 계약 전 최신 매물의 보증금과 관리비를 확인하세요.",
            "통근 시간과 야간 이동 동선은 직접 확인하세요.",
        ],
    )


def validate_grounding(report: AIReportContent, evidence: AIReportEvidencePack) -> None:
    valid_ids = {metric.evidence_id for metric in evidence.metrics}
    cited_ids = {item for section in report.sections for item in section.evidence_ids}
    invalid_ids = cited_ids - valid_ids
    if invalid_ids:
        raise ValueError(f"unknown evidence ids: {sorted(invalid_ids)}")
    narrative = " ".join(
        [report.executive_summary]
        + [section.analysis for section in report.sections]
    )
    numeric_check_text = narrative
    for region in evidence.regions:
        for region_name in (region.display_name, region.dong_name, region.gu_name):
            numeric_check_text = numeric_check_text.replace(region_name, "")
    if NUMBER_PATTERN.search(numeric_check_text):
        raise ValueError("AI narrative must not reproduce or calculate numeric values")
    if any(phrase in narrative for phrase in PROHIBITED_PHRASES):
        raise ValueError("AI narrative crossed a product safety boundary")


def build_prompt(evidence: AIReportEvidencePack) -> str:
    compact_context = {
        "data_version": evidence.data_version,
        "request": evidence.request.model_dump(),
        "regions": [region.model_dump() for region in evidence.regions],
        "metrics": [
            {
                "evidence_id": metric.evidence_id,
                "region_id": metric.region_id,
                "domain": metric.domain,
                "metric_key": metric.metric_key,
                "label": metric.label,
                "value": metric.value,
                "unit": metric.unit,
                "data_date": metric.data_date,
                "quality_status": metric.quality_status,
            }
            for metric in evidence.metrics
        ],
        "comparisons": [comparison.model_dump() for comparison in evidence.comparisons],
        "quality_flags": [flag.model_dump() for flag in evidence.quality_flags],
    }
    return (
        "당신은 주거 후보 비교 리포트 작성자입니다. 추천하거나 승자를 정하지 마세요. "
        "숫자는 화면의 백엔드 비교표가 표시하므로 어떤 숫자나 숫자 문자를 서술에 쓰지 마세요. "
        "각 섹션은 제공된 metric evidence_id만 인용하세요. 가격, 생활인구, 안전 대체 지표, "
        "생활 편의에 대해 정확히 네 개의 섹션을 만들고 상충 조건과 데이터 한계를 "
        "간결한 한국어로 설명하세요. "
        "안심시설과 유흥시설은 안전 또는 위험을 보장하지 않습니다.\n\nEVIDENCE:\n"
        + json.dumps(compact_context, ensure_ascii=False, separators=(",", ":"))
    )


def call_openai(
    evidence: AIReportEvidencePack, openai_token: str, model: str
) -> tuple[AIReportContent, dict[str, int]]:
    payload = {
        "model": model,
        "input": build_prompt(evidence),
        "text": {
            "format": {
                "type": "json_schema",
                "name": "sweethome_ai_report",
                "strict": True,
                "schema": AIReportContent.model_json_schema(),
            }
        },
    }
    with httpx.Client(timeout=25.0) as client:
        response = client.post(
            OPENAI_RESPONSES_URL,
            headers={"authorization": f"Bearer {openai_token}", "content-type": "application/json"},
            json=payload,
        )
        response.raise_for_status()
        body = response.json()
    output_text = next(
        content["text"]
        for item in body.get("output", [])
        if item.get("type") == "message"
        for content in item.get("content", [])
        if content.get("type") == "output_text"
    )
    usage = body.get("usage", {})
    return AIReportContent.model_validate_json(output_text), {
        "input_tokens": int(usage.get("input_tokens", 0)),
        "output_tokens": int(usage.get("output_tokens", 0)),
    }


def generate_ai_report(
    request: AIReportPreviewRequest,
    provider: Optional[
        Callable[
            [AIReportEvidencePack, str, str],
            Union[AIReportContent, tuple[AIReportContent, dict[str, int]]],
        ]
    ] = None,
) -> AIReportResponse:
    started_at = time.perf_counter()
    evidence = build_evidence_pack(request)
    openai_token = os.getenv("OPENAI_API_KEY", "").strip()
    model = os.getenv("OPENAI_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL
    report: AIReportContent
    generation_mode = "deterministic_fallback"
    used_model: Optional[str] = None
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    fallback_reason: Optional[str] = None

    if openai_token:
        try:
            provider_result = (provider or call_openai)(evidence, openai_token, model)
            if isinstance(provider_result, tuple):
                report, usage = provider_result
                input_tokens = usage.get("input_tokens")
                output_tokens = usage.get("output_tokens")
            else:
                report = provider_result
            validate_grounding(report, evidence)
            generation_mode = "openai"
            used_model = model
        except (httpx.HTTPError, ValidationError, ValueError, StopIteration, KeyError, TypeError) as exc:
            report = fallback_report(evidence)
            fallback_reason = type(exc).__name__
    else:
        report = fallback_report(evidence)
        fallback_reason = "OPENAI_API_KEY_NOT_CONFIGURED"

    validate_grounding(report, evidence)
    return AIReportResponse(
        schema_version="1.0.0",
        report_id=f"report:{uuid.uuid4()}",
        generation_mode=generation_mode,
        model=used_model,
        prompt_version=PROMPT_VERSION,
        latency_ms=round((time.perf_counter() - started_at) * 1000),
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        fallback_reason=fallback_reason,
        evidence=evidence,
        report=report,
    )
