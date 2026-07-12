from fastapi.testclient import TestClient

from src.ai_report.contracts import AIReportContent, AIReportSection
from src.ai_report.generate_ai_report import generate_ai_report
from src.ai_report.generate_ai_report import build_prompt
from src.ai_report.evidence import build_evidence_pack
from src.ai_report.contracts import AIReportPreviewRequest
from src.api.main import app


client = TestClient(app)


def test_prompt_uses_compact_evidence_context() -> None:
    evidence = build_evidence_pack(
        AIReportPreviewRequest(region_a="개포1동", region_b="개포4동")
    )
    prompt = build_prompt(evidence)

    assert '"metrics"' in prompt
    assert '"quality_flags"' in prompt
    assert '"chart_specs"' not in prompt
    assert '"interpretation_policies"' not in prompt
    assert '"source_documents"' not in prompt
    assert all(metric.evidence_id in prompt for metric in evidence.metrics)


def test_report_endpoint_returns_deterministic_fallback_without_api_key(monkeypatch) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = client.post(
        "/ai/reports",
        json={"region_a": "개포1동", "region_b": "개포4동"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["generation_mode"] == "deterministic_fallback"
    assert payload["model"] is None
    assert payload["prompt_version"] == "ai-report-beta-v1"
    assert payload["latency_ms"] >= 0
    assert payload["fallback_reason"] == "OPENAI_API_KEY_NOT_CONFIGURED"
    assert len(payload["report"]["sections"]) >= 3
    evidence_ids = {metric["evidence_id"] for metric in payload["evidence"]["metrics"]}
    assert all(
        evidence_id in evidence_ids
        for section in payload["report"]["sections"]
        for evidence_id in section["evidence_ids"]
    )


def test_invalid_ai_evidence_falls_back(monkeypatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    def invalid_provider(evidence, api_key, model):
        return AIReportContent(
            executive_summary="후보의 조건을 함께 살펴봤습니다.",
            sections=[
                AIReportSection(
                    heading="분석",
                    analysis="근거를 비교했습니다.",
                    evidence_ids=["metric:unknown:value"],
                )
                for _ in range(3)
            ],
            cautions=["데이터 한계를 확인해야 합니다."],
            next_checks=["현장을 확인하세요."],
        )

    result = generate_ai_report(
        AIReportPreviewRequest(region_a="개포1동", region_b="개포4동"),
        provider=invalid_provider,
    )

    assert result.generation_mode == "deterministic_fallback"
    assert result.fallback_reason == "ValueError"


def test_ai_narrative_cannot_reproduce_numbers(monkeypatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    def numeric_provider(evidence, api_key, model):
        evidence_id = evidence.metrics[0].evidence_id
        return AIReportContent(
            executive_summary="두 후보를 비교했습니다.",
            sections=[
                AIReportSection(
                    heading="분석",
                    analysis="가격 차이는 10퍼센트입니다.",
                    evidence_ids=[evidence_id],
                )
                for _ in range(3)
            ],
            cautions=["기준일을 확인해야 합니다."],
            next_checks=["현장을 확인하세요."],
        )

    result = generate_ai_report(
        AIReportPreviewRequest(region_a="개포1동", region_b="개포4동"),
        provider=numeric_provider,
    )

    assert result.generation_mode == "deterministic_fallback"
    assert "10" not in result.report.model_dump_json()


def test_grounding_allows_digits_that_are_part_of_official_region_names(monkeypatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    def region_name_provider(evidence, openai_token, model):
        evidence_id = evidence.metrics[0].evidence_id
        return AIReportContent(
            executive_summary="개포1동과 개포4동의 조건을 비교했습니다.",
            sections=[
                AIReportSection(
                    heading="분석",
                    analysis="개포1동의 관측값은 비교표에서 확인할 수 있습니다.",
                    evidence_ids=[evidence_id],
                )
                for _ in range(3)
            ],
            cautions=["기준일을 확인해야 합니다."],
            next_checks=["현장을 확인하세요."],
        )

    result = generate_ai_report(
        AIReportPreviewRequest(region_a="개포1동", region_b="개포4동"),
        provider=region_name_provider,
    )

    assert result.generation_mode == "openai"
