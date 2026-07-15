"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { fetchAuthSession, fetchSavedReport } from "@/lib/api";
import type { CandidateMatchRegion, SavedReportDetail } from "@/types/sweethome";

export default function SavedReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = use(params);
  const [report, setReport] = useState<SavedReportDetail | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const session = await fetchAuthSession();
        if (!session) {
          const redirect = `/mypage/reports/${encodeURIComponent(reportId)}`;
          window.location.replace(`/login?redirect=${encodeURIComponent(redirect)}`);
          return;
        }
        const savedReport = await fetchSavedReport(reportId);
        if (active) setReport(savedReport);
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "리포트를 불러오지 못했습니다.");
      }
    }
    void load();
    return () => { active = false; };
  }, [reportId]);

  return (
    <main className="warm-canvas min-h-screen text-ink">
      <header className="border-b border-line bg-white/82 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1100px] items-center justify-between px-5 sm:px-8">
          <Link className="w-40" href="/"><BrandLogo /></Link>
          <Link className="text-sm font-semibold text-muted hover:text-ink" href="/mypage">← 내 기록</Link>
        </div>
      </header>
      <div className="mx-auto max-w-[1100px] px-5 py-12 sm:px-8 sm:py-16">
        {message ? <div className="rounded-2xl border border-[#efc8d0] bg-[#fff6f8] p-8 text-sm text-[#9d4254]">{message}</div> : null}
        {!report && !message ? <div className="rounded-2xl border border-line bg-white/80 p-8 text-sm text-muted">저장한 리포트를 불러오는 중입니다.</div> : null}
        {report ? (
          <>
            <p className="text-xs font-bold tracking-[0.1em] text-sage-strong">SAVED DECISION REPORT</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">{report.title}</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-muted">{report.summary}</p>
            <div className="mt-8 flex flex-wrap gap-2">
              {report.report_content.priority_labels.map((label) => <span className="rounded-full bg-sage-soft px-3 py-2 text-xs font-bold text-sage-strong" key={label}>{label}</span>)}
            </div>

            <section className="mt-10 rounded-2xl border border-sage-line bg-white/90 p-6">
              <p className="text-xs font-bold text-sage-strong">의사결정 흐름</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <FlowStep number="01" title="후보 선택" text={`${report.region_names.length}개 지역을 비교 대상으로 선택했습니다.`} />
                <FlowStep number="02" title="판단 기준" text={`${report.report_content.priority_labels.join(", ")} 데이터를 확인했습니다.`} />
                <FlowStep number="03" title="근거 저장" text="저장 당시의 데이터 수치와 해석을 함께 보관했습니다." />
              </div>
              <p className="mt-5 border-t border-line pt-4 text-xs leading-5 text-muted">{report.report_content.decision_flow.notice}</p>
            </section>

            <div className={`mt-6 grid gap-5 ${report.report_content.regions.length === 2 ? "lg:grid-cols-2" : ""}`}>
              {report.report_content.regions.map((region) => <RegionEvidenceCard key={region.region_id} region={region} />)}
            </div>

            <section className="mt-6 rounded-2xl border border-line bg-white/78 p-6 text-xs leading-6 text-muted">
              <p><strong className="text-ink">데이터 버전</strong> {report.data_version}</p>
              <p className="mt-2"><strong className="text-ink">출처</strong> {report.report_content.source}</p>
              <p className="mt-2"><strong className="text-ink">해석 한계</strong> {report.report_content.limitation}</p>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

function FlowStep({ number, title, text }: { number: string; title: string; text: string }) {
  return <div className="rounded-xl bg-surface-soft p-4"><p className="text-[10px] font-bold text-sage-strong">{number}</p><p className="mt-2 text-sm font-bold">{title}</p><p className="mt-2 text-xs leading-5 text-muted">{text}</p></div>;
}

function RegionEvidenceCard({ region }: { region: CandidateMatchRegion }) {
  return (
    <article className="rounded-2xl border border-line bg-white/92 p-6 shadow-[0_12px_36px_rgba(52,78,68,0.05)]">
      <p className="text-xs font-semibold text-subtle">{region.gu_name}</p>
      <h2 className="mt-2 text-2xl font-semibold">{region.dong_name}</h2>
      <div className="mt-6 divide-y divide-line">
        {region.evidence_metrics.map((metric) => (
          <div className="grid gap-2 py-4 sm:grid-cols-[140px_1fr]" key={`${metric.condition}-${metric.label}`}>
            <div><p className="text-xs font-bold text-ink">{metric.label}</p><p className="mt-1 text-sm font-semibold text-sage-strong">{metric.display_value}</p></div>
            <div><p className="text-xs leading-5 text-muted">{metric.interpretation}</p><p className="mt-2 text-[11px] text-subtle">기준 {metric.data_date ?? "원천별 상이"} · {metric.reliability}</p></div>
          </div>
        ))}
      </div>
    </article>
  );
}
