"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { fetchAuthSession, fetchSavedReports } from "@/lib/api";
import type { ExploreCondition, SavedReportSummary } from "@/types/sweethome";

const PRIORITY_LABELS: Record<ExploreCondition, string> = {
  price: "주거 비용",
  population: "거주·활동 특성",
  safety: "야간 생활환경",
  convenience: "생활 편의",
  transport: "교통 접근성",
};

export default function MyPage() {
  const [reports, setReports] = useState<SavedReportSummary[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const session = await fetchAuthSession();
        if (!session) {
          window.location.replace(`/login?redirect=${encodeURIComponent("/mypage")}`);
          return;
        }
        const savedReports = await fetchSavedReports();
        if (active) {
          setReports(savedReports);
          setStatus("ready");
        }
      } catch (error) {
        if (active) {
          setMessage(error instanceof Error ? error.message : "내 기록을 불러오지 못했습니다.");
          setStatus("error");
        }
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  return (
    <main className="warm-canvas min-h-screen text-ink">
      <header className="border-b border-line bg-white/82 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1180px] items-center justify-between px-5 sm:px-8">
          <Link className="w-40" href="/"><BrandLogo /></Link>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Link className="rounded-lg px-3 py-2 text-muted hover:text-ink" href="/app">새 비교</Link>
            <a className="rounded-lg px-3 py-2 text-muted hover:text-ink" href="/.auth/logout?post_logout_redirect_uri=/">로그아웃</a>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1180px] px-5 py-14 sm:px-8 sm:py-20">
        <p className="text-xs font-bold tracking-[0.1em] text-sage-strong">MY SWEETHOME</p>
        <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">내 주거 의사결정 기록</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
              저장한 후보와 당시 중요하게 본 기준을 시간순으로 확인하세요. 리포트는 정답이나 추천이 아니라 저장 시점의 비교 근거입니다.
            </p>
          </div>
          <Link className="inline-flex min-h-11 items-center justify-center rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white hover:bg-charcoal" href="/app/report-map?mode=direct&conditions=price,convenience,safety,population,transport">
            지도에서 새로 비교하기
          </Link>
        </div>

        {status === "loading" ? (
          <div className="mt-12 rounded-2xl border border-line bg-white/80 p-8 text-sm text-muted">내 기록을 불러오는 중입니다.</div>
        ) : null}
        {status === "error" ? (
          <div className="mt-12 rounded-2xl border border-[#efc8d0] bg-[#fff6f8] p-8 text-sm text-[#9d4254]">{message}</div>
        ) : null}
        {status === "ready" && reports.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-line bg-white/88 p-10 text-center shadow-[0_16px_50px_rgba(52,78,68,0.06)]">
            <p className="text-xl font-semibold">아직 저장한 비교 기록이 없습니다</p>
            <p className="mt-3 text-sm text-muted">지도에서 1~2개 지역을 선택하고 나만의 리포트를 만들어 보세요.</p>
          </div>
        ) : null}
        {status === "ready" && reports.length > 0 ? (
          <div className="mt-12 grid gap-4">
            {reports.map((report, index) => (
              <Link
                className="group grid gap-5 rounded-2xl border border-line bg-white/88 p-6 shadow-[0_12px_36px_rgba(52,78,68,0.05)] transition hover:-translate-y-0.5 hover:border-sage-line hover:shadow-[0_18px_46px_rgba(52,78,68,0.09)] sm:grid-cols-[80px_1fr_auto] sm:items-center"
                href={`/mypage/reports/${report.report_id}`}
                key={report.report_id}
              >
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-sage-soft text-sm font-bold text-sage-strong">{String(index + 1).padStart(2, "0")}</div>
                <div>
                  <p className="text-xs font-semibold text-subtle">{formatCreatedAt(report.created_at)} 저장</p>
                  <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em]">{report.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">{report.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {report.priority_keys.map((priority) => (
                      <span className="rounded-full border border-line bg-surface-soft px-3 py-1.5 text-xs font-semibold text-muted" key={priority}>{PRIORITY_LABELS[priority]}</span>
                    ))}
                  </div>
                </div>
                <span className="text-sm font-bold text-sage-strong transition group-hover:translate-x-1">자세히 보기 →</span>
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}
