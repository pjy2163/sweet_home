from __future__ import annotations

from src.api.schemas import CompareResponse
from src.api.services.data_service import read_enriched_snapshot
from src.api.services.region_service import region_to_response, resolve_region
from src.report.generate_report import (
    generate_report,
    render_data_basis,
    render_summary,
)


def _strip_bullet_prefix(lines: list[str]) -> list[str]:
    return [line.removeprefix("- ") for line in lines]


def compare_region_snapshots(a: str, b: str) -> CompareResponse:
    snapshot = read_enriched_snapshot()
    region_a = resolve_region(snapshot, a)
    region_b = resolve_region(snapshot, b)

    return CompareResponse(
        region_a=region_to_response(region_a),
        region_b=region_to_response(region_b),
        summary=_strip_bullet_prefix(render_summary(region_a, region_b)[1:]),
        data_basis=_strip_bullet_prefix(render_data_basis(region_a, region_b)[1:]),
        report_text=generate_report(region_a, region_b),
    )
