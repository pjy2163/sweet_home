"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";

import { fetchAIReport } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import type { AIReportResponse, EvidenceChartSpec } from "@/types/sweethome";

const REPORT_STORAGE_KEY = "sweethome:ai-report";

export default function AIReportPage() {
  return (
    <Suspense fallback={<ReportLoading />}>
      <AIReportContent />
    </Suspense>
  );
}

function AIReportContent() {
  const searchParams = useSearchParams();
  const regionA = searchParams.get("a") ?? "";
  const regionB = searchParams.get("b") ?? "";
  const [result, setResult] = useState<AIReportResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = window.sessionStorage.getItem(REPORT_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AIReportResponse;
        const names = parsed.evidence.regions.map((region) => region.display_name);
        if (names.includes(regionA) && names.includes(regionB)) {
          Promise.resolve(parsed).then(setResult);
          return;
        }
      } catch {
        window.sessionStorage.removeItem(REPORT_STORAGE_KEY);
      }
    }

    if (!regionA || !regionB) {
      Promise.resolve("비교할 후보 지역 정보가 없습니다.").then(setError);
      return;
    }

    let ignore = false;
    fetchAIReport({ region_a: regionA, region_b: regionB, comparison_basis: "seoul" })
      .then((nextResult) => {
        if (!ignore) {
          setResult(nextResult);
          window.sessionStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(nextResult));
        }
      })
      .catch((cause) => {
        if (!ignore) {
          setError(cause instanceof Error ? cause.message : "AI 리포트를 생성하지 못했습니다.");
        }
      });

    return () => { ignore = true; };
  }, [regionA, regionB]);

  if (error) return <ReportError message={error} />;
  if (!result) return <ReportLoading />;

  return <ResearchReport result={result} />;
}

function ResearchReport({ result }: { result: AIReportResponse }) {
  const [regionA, regionB] = result.evidence.regions;
  const generatedBy = result.generation_mode === "openai" ? "AI 분석" : "검증 규칙 분석";

  return (
    <main className="min-h-screen bg-[#f6f6f8] text-[#111a4a]">
      <header className="sticky top-0 z-30 border-b border-[#e3e4e8]/90 bg-[#f6f6f8]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link className="text-sm font-semibold tracking-[-0.02em]" href="/app/report-map">
            SweetHome Research
          </Link>
          <div className="flex items-center gap-4 text-xs text-[#7c7f88]">
            <span>{generatedBy}</span>
            <Link className="rounded-lg border border-[#111a4a] px-4 py-2 font-medium text-[#111a4a]" href="/app/report-map">
              지도 돌아가기
            </Link>
          </div>
        </div>
      </header>

      <section className="border-b border-[#e3e4e8] px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#167e6c]">
            Candidate Research Report
          </p>
          <h1 className="mt-8 max-w-5xl text-5xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-7xl">
            두 후보를 하나의 점수가 아닌 근거의 흐름으로 읽습니다.
          </h1>
          <div className="mt-14 grid gap-6 border-t border-[#cbcccf] pt-8 md:grid-cols-[1fr_auto_1fr] md:items-center">
            <RegionTitle index="A" name={regionA.display_name} />
            <span className="font-mono text-xs text-[#a9acb6]">VERSUS</span>
            <RegionTitle index="B" name={regionB.display_name} />
          </div>
          <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 font-mono text-[11px] text-[#7c7f88]">
            <span>DATA {result.evidence.data_version.replace("sha256:", "")}</span>
            <span>PROMPT {result.prompt_version}</span>
            <span>MODEL {result.model ?? "fallback"}</span>
            <span>LATENCY {(result.latency_ms / 1000).toFixed(1)}s</span>
          </div>
        </div>
      </section>

      <ReportSection eyebrow="Executive summary" title="분석 요약" number="01">
        <p className="max-w-4xl text-2xl leading-[1.55] tracking-[-0.02em] text-[#3b3e47] sm:text-3xl">
          {result.report.executive_summary}
        </p>
      </ReportSection>

      <ReportSection eyebrow="Observed differences" title="한눈에 보는 비교" number="02">
        <div className="grid gap-5 md:grid-cols-2">
          {result.evidence.chart_specs.map((chart) => (
            <MetricResearchCard chart={chart} key={chart.chart_id} />
          ))}
        </div>
      </ReportSection>

      <ReportSection eyebrow="Interpretation" title="도메인별 상세 분석" number="03">
        <div className="divide-y divide-[#e3e4e8] border-y border-[#e3e4e8]">
          {result.report.sections.map((section, index) => (
            <article className="grid gap-5 py-12 md:grid-cols-[8rem_1fr]" key={`${section.heading}-${index}`}>
              <p className="font-mono text-xs text-[#44b48b]">{String(index + 1).padStart(2, "0")}</p>
              <div>
                <h3 className="text-3xl font-medium tracking-[-0.025em]">{section.heading}</h3>
                <p className="mt-6 max-w-3xl text-lg leading-8 text-[#3b3e47]">{section.analysis}</p>
              </div>
            </article>
          ))}
        </div>
      </ReportSection>

      <ReportSection eyebrow="Data limitations" title="이 결과를 읽을 때" number="04">
        <div className="grid gap-5 md:grid-cols-2">
          {result.report.cautions.map((item, index) => (
            <article className="rounded-lg border border-[#f2936b]/35 bg-[#fff6f1] p-6" key={`${item}-${index}`}>
              <p className="font-mono text-xs text-[#ec652b]">CAUTION {String(index + 1).padStart(2, "0")}</p>
              <p className="mt-5 leading-7 text-[#3b3e47]">{item}</p>
            </article>
          ))}
        </div>
      </ReportSection>

      <ReportSection eyebrow="Before deciding" title="직접 확인할 사항" number="05">
        <ol className="divide-y divide-[#cbcccf] border-y border-[#cbcccf]">
          {result.report.next_checks.map((item, index) => (
            <li className="grid gap-4 py-8 md:grid-cols-[5rem_1fr] md:items-center" key={item}>
              <span className="font-mono text-sm text-[#167e6c]">{String(index + 1).padStart(2, "0")}</span>
              <span className="text-xl leading-8 text-[#3b3e47]">{item}</span>
            </li>
          ))}
        </ol>
      </ReportSection>

      <footer className="bg-[#111a4a] px-6 py-20 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#94efb7]">Methodology</p>
            <h2 className="mt-5 text-4xl font-medium tracking-[-0.035em]">계산은 백엔드가,<br />설명은 AI가 담당합니다.</h2>
          </div>
          <div className="space-y-5 text-sm leading-7 text-white/70">
            <p>지역 수치, 기준일과 품질 판정은 검증된 SweetHome Evidence Pack에서 생성됩니다.</p>
            <p>AI는 수치를 계산하거나 특정 지역을 선택하지 않으며, 검증된 비교 결과의 관계와 한계만 설명합니다.</p>
            <p>안전 관련 시설 지표는 범죄율이나 실제 체감 안전을 보장하지 않습니다.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}

function RegionTitle({ index, name }: { index: string; name: string }) {
  return (
    <div>
      <p className="font-mono text-xs text-[#44b48b]">REGION {index}</p>
      <h2 className="mt-2 text-3xl font-medium tracking-[-0.025em]">{name}</h2>
    </div>
  );
}

function ReportSection({ children, eyebrow, number, title }: { children: ReactNode; eyebrow: string; number: string; title: string }) {
  return (
    <section className="px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 grid gap-4 border-t border-[#cbcccf] pt-6 md:grid-cols-[8rem_1fr_auto] md:items-end">
          <span className="font-mono text-xs text-[#44b48b]">{number}</span>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#7c7f88]">{eyebrow}</p>
            <h2 className="mt-3 text-4xl font-medium tracking-[-0.035em] sm:text-5xl">{title}</h2>
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

function MetricResearchCard({ chart }: { chart: EvidenceChartSpec }) {
  const values = chart.data.filter((datum): datum is typeof datum & { value: number } => datum.value !== null);
  const range = Math.max(chart.axis_max - chart.axis_min, 1);
  return (
    <article className="rounded-lg border border-[#e3e4e8] bg-white p-6 shadow-[0_8px_20px_rgba(17,26,74,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg font-medium tracking-[-0.015em]">{chart.title}</h3>
        <span className="font-mono text-[10px] text-[#7c7f88]">{chart.unit}</span>
      </div>
      <div className="mt-8 space-y-6">
        {values.map((datum) => {
          const width = Math.max(4, ((datum.value - chart.axis_min) / range) * 100);
          return (
            <div key={datum.region_id}>
              <div className="flex items-end justify-between gap-3 text-sm">
                <span className="text-[#7c7f88]">{datum.label}</span>
                <strong className="font-mono font-medium text-[#167e6c]">{formatNumber(datum.value)} {chart.unit}</strong>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eef0f1]">
                <div className="h-full rounded-full bg-[#44b48b]" style={{ width: `${Math.min(width, 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function ReportLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f6f8] px-6 text-[#111a4a]">
      <div className="max-w-xl text-center">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#167e6c]">Building grounded report</p>
        <h1 className="mt-6 text-4xl font-medium tracking-[-0.035em]">검증된 근거를 긴 호흡의 리포트로 정리하고 있습니다.</h1>
        <p className="mt-5 text-[#7c7f88]">수치 계산은 완료됐습니다. AI가 조건 사이의 관계와 한계를 설명하는 중입니다.</p>
      </div>
    </main>
  );
}

function ReportError({ message }: { message: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f6f8] px-6 text-[#111a4a]">
      <div className="max-w-xl rounded-lg border border-[#e3e4e8] bg-white p-8 text-center">
        <h1 className="text-3xl font-medium">리포트를 열지 못했습니다.</h1>
        <p className="mt-4 leading-7 text-[#7c7f88]">{message}</p>
        <Link className="mt-7 inline-block rounded-lg bg-[#111a4a] px-5 py-3 text-sm font-medium text-white" href="/app/report-map">지도에서 다시 선택하기</Link>
      </div>
    </main>
  );
}
