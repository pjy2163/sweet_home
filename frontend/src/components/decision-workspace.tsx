"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { ComparisonResult } from "@/components/comparison-result";
import { fetchCandidateMatches, fetchComparison } from "@/lib/api";
import type {
  CandidateMatchRegion,
  CompareResponse,
  ExploreCondition,
  ExploreResponse,
} from "@/types/sweethome";

type WorkspaceStep = "profile" | "candidates" | "comparison";
type CandidateState = "saved" | "excluded";

type DecisionProfile = {
  contractType: "monthly" | "jeonse";
  budget: string;
  conditions: ExploreCondition[];
};

const STORAGE_KEY = "sweethome.decision-workspace.v1";
const DEFAULT_PROFILE: DecisionProfile = {
  contractType: "monthly",
  budget: "80",
  conditions: ["price", "convenience"],
};

const CONDITION_OPTIONS: Array<{
  id: ExploreCondition;
  label: string;
  description: string;
}> = [
  { id: "price", label: "주거 비용", description: "서울 평균 대비 가격 수준" },
  { id: "convenience", label: "생활 편의", description: "일상 상권과 편의시설" },
  { id: "safety", label: "야간 환경", description: "안전 관련 대체 지표" },
  { id: "population", label: "생활 밀도", description: "행정동 생활인구 규모" },
];

const CONDITION_LABELS: Record<ExploreCondition, string> = {
  price: "주거 비용",
  convenience: "생활 편의",
  safety: "야간 환경",
  population: "생활 밀도",
  transport: "교통",
};

export function DecisionWorkspace() {
  const [step, setStep] = useState<WorkspaceStep>("profile");
  const [profile, setProfile] = useState<DecisionProfile>(DEFAULT_PROFILE);
  const [exploration, setExploration] = useState<ExploreResponse | null>(null);
  const [candidateStates, setCandidateStates] = useState<Record<string, CandidateState>>({});
  const [comparison, setComparison] = useState<CompareResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasRestored, setHasRestored] = useState(false);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as {
            profile?: DecisionProfile;
            candidateStates?: Record<string, CandidateState>;
          };
          if (parsed.profile) setProfile(parsed.profile);
          if (parsed.candidateStates) setCandidateStates(parsed.candidateStates);
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      } finally {
        setHasRestored(true);
      }
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    if (!hasRestored) return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ profile, candidateStates }),
    );
  }, [candidateStates, hasRestored, profile]);

  const savedCandidates = useMemo(
    () =>
      exploration?.regions.filter(
        (region) => candidateStates[region.region_id] === "saved",
      ) ?? [],
    [candidateStates, exploration],
  );

  function toggleCondition(condition: ExploreCondition) {
    setProfile((current) => ({
      ...current,
      conditions: current.conditions.includes(condition)
        ? current.conditions.filter((item) => item !== condition)
        : [...current.conditions, condition],
    }));
  }

  async function discoverCandidates() {
    if (!profile.conditions.length) {
      setError("의사결정 기준을 하나 이상 선택해 주세요.");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      const result = await fetchCandidateMatches(profile.conditions, 8, {
        excludeLowVolumePrice: profile.conditions.includes("price"),
      });
      setExploration(result);
      setStep("candidates");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "후보를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  function updateCandidate(regionId: string, state: CandidateState) {
    setCandidateStates((current) => {
      const next = { ...current };
      if (next[regionId] === state) delete next[regionId];
      else next[regionId] = state;
      return next;
    });
  }

  async function compareFinalists() {
    if (savedCandidates.length !== 2) return;
    setError("");
    setIsLoading(true);
    try {
      setComparison(
        await fetchComparison(
          savedCandidates[0].region_id,
          savedCandidates[1].region_id,
        ),
      );
      setStep("comparison");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "비교 결과를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="decision-workspace min-h-screen bg-[#f6f7f9] text-[#17203b]">
      <WorkspaceSidebar step={step} onStepChange={setStep} />
      <div className="min-h-screen lg:pl-[260px]">
        <header className="flex min-h-16 items-center justify-between border-b border-[#e3e6ed] bg-white px-5 sm:px-8 lg:px-12">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a91a3]">Decision workspace</p>
            <p className="mt-1 text-sm text-[#5f6678]">서울 행정동 · 최신 가용 데이터 기준</p>
          </div>
          <span className="rounded-full bg-[#eef5ff] px-3 py-1.5 text-xs font-semibold text-[#2475d0]">MVP</span>
        </header>

        <div className="mx-auto max-w-[1180px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
          {step === "profile" ? (
            <DecisionProfilePanel
              error={error}
              isLoading={isLoading}
              onContinue={discoverCandidates}
              onContractChange={(contractType) => setProfile((current) => ({ ...current, contractType }))}
              onBudgetChange={(budget) => setProfile((current) => ({ ...current, budget }))}
              onToggleCondition={toggleCondition}
              profile={profile}
            />
          ) : null}
          {step === "candidates" ? (
            <CandidateBoard
              candidateStates={candidateStates}
              error={error}
              exploration={exploration}
              isLoading={isLoading}
              onCompare={compareFinalists}
              onEditProfile={() => setStep("profile")}
              onUpdateCandidate={updateCandidate}
              profile={profile}
              savedCandidates={savedCandidates}
            />
          ) : null}
          {step === "comparison" ? (
            <div>
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <PageIntro eyebrow="Evidence-based comparison" title="최종 후보를 같은 기준으로 비교합니다" description="강조 결과는 종합 순위가 아닌 지표별 상대 비교입니다." />
                <button className="rounded-lg border border-[#d7dce6] bg-white px-4 py-2.5 text-sm font-semibold text-[#4d5568]" onClick={() => setStep("candidates")} type="button">← 후보 보드</button>
              </div>
              <ComparisonResult comparison={comparison} />
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function WorkspaceSidebar({ step, onStepChange }: { step: WorkspaceStep; onStepChange: (step: WorkspaceStep) => void }) {
  const items: Array<{ id: WorkspaceStep; label: string; number: string }> = [
    { id: "profile", label: "내 조건", number: "01" },
    { id: "candidates", label: "후보 보드", number: "02" },
    { id: "comparison", label: "지역 비교", number: "03" },
  ];
  return (
    <aside className="hidden border-r border-[#e2e5eb] bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-[260px] lg:flex-col">
      <Link className="flex h-24 items-center border-b border-[#e2e5eb] px-8" href="/" aria-label="SweetHome 홈">
        <BrandLogo />
      </Link>
      <div className="px-8 py-9">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a0a6b4]">My decision</p>
        <h1 className="mt-3 text-2xl font-medium tracking-[-0.03em]">주거 의사결정</h1>
      </div>
      <nav className="px-4">
        {items.map((item) => (
          <button
            className={`mb-1 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition ${step === item.id ? "bg-[#eaf4ff] font-semibold text-[#1888e8]" : "text-[#666e80] hover:bg-[#f5f6f8]"}`}
            key={item.id}
            onClick={() => onStepChange(item.id)}
            type="button"
          >
            <span className="text-[10px] text-current opacity-70">{item.number}</span>{item.label}
          </button>
        ))}
      </nav>
      <div className="mt-auto border-t border-[#e2e5eb] p-6 text-xs leading-5 text-[#8a91a3]">AI가 결정을 대신하지 않습니다.<br />근거를 정리해 판단을 돕습니다.</div>
    </aside>
  );
}

function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1888e8]">{eyebrow}</p><h2 className="mt-3 text-3xl font-medium tracking-[-0.035em] sm:text-4xl">{title}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6d7485] sm:text-base">{description}</p></div>;
}

function DecisionProfilePanel({ profile, error, isLoading, onContractChange, onBudgetChange, onToggleCondition, onContinue }: {
  profile: DecisionProfile; error: string; isLoading: boolean;
  onContractChange: (value: DecisionProfile["contractType"]) => void;
  onBudgetChange: (value: string) => void;
  onToggleCondition: (value: ExploreCondition) => void;
  onContinue: () => void;
}) {
  return (
    <section>
      <PageIntro eyebrow="Decision profile" title="어떤 집을 찾고 계신가요?" description="조건을 구조화하면 동일한 기준으로 살펴볼 지역을 좁힐 수 있습니다." />
      <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <div className="rounded-xl border border-[#e0e4eb] bg-white p-6 shadow-[0_6px_20px_rgba(25,39,74,.04)] sm:p-8">
          <fieldset>
            <legend className="text-sm font-semibold">계약 유형</legend>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {(["monthly", "jeonse"] as const).map((type) => <button aria-pressed={profile.contractType === type} className={`rounded-lg border px-4 py-4 text-sm font-semibold ${profile.contractType === type ? "border-[#1888e8] bg-[#edf7ff] text-[#1479ca]" : "border-[#dfe3ea] text-[#5f6678]"}`} key={type} onClick={() => onContractChange(type)} type="button">{type === "monthly" ? "월세" : "전세"}</button>)}
            </div>
          </fieldset>
          <label className="mt-7 block text-sm font-semibold" htmlFor="budget">{profile.contractType === "monthly" ? "월 고정 주거비 상한" : "보증금 상한"}</label>
          <div className="mt-3 flex items-center rounded-lg border border-[#dfe3ea] bg-white px-4 focus-within:border-[#1888e8]">
            <input className="h-14 min-w-0 flex-1 outline-none" id="budget" inputMode="numeric" onChange={(event) => onBudgetChange(event.target.value.replace(/[^0-9]/g, ""))} value={profile.budget} />
            <span className="text-sm text-[#737b8d]">만원</span>
          </div>
          <fieldset className="mt-8">
            <legend className="text-sm font-semibold">중요하게 볼 조건 <span className="font-normal text-[#8b92a1]">· 복수 선택</span></legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {CONDITION_OPTIONS.map((condition) => { const selected = profile.conditions.includes(condition.id); return <button aria-pressed={selected} className={`rounded-lg border p-4 text-left transition ${selected ? "border-[#1888e8] bg-[#edf7ff]" : "border-[#dfe3ea] hover:border-[#aeb6c5]"}`} key={condition.id} onClick={() => onToggleCondition(condition.id)} type="button"><span className="flex items-center justify-between font-semibold"><span>{condition.label}</span><span className={`grid h-5 w-5 place-items-center rounded-full text-xs ${selected ? "bg-[#1888e8] text-white" : "border border-[#cbd1dc]"}`}>{selected ? "✓" : ""}</span></span><span className="mt-2 block text-xs leading-5 text-[#7b8292]">{condition.description}</span></button>; })}
            </div>
          </fieldset>
          {error ? <p className="mt-5 rounded-lg bg-[#fff3f2] px-4 py-3 text-sm text-[#b1453f]">{error}</p> : null}
          <button className="mt-8 h-13 w-full rounded-lg bg-[#17203b] px-5 font-semibold text-white transition hover:bg-[#263252] disabled:bg-[#a6adba]" disabled={isLoading} onClick={onContinue} type="button">{isLoading ? "후보군 분석 중…" : "조건 확인하고 후보 탐색"}</button>
        </div>
        <aside className="rounded-xl border border-[#dce5ef] bg-[#f1f8ff] p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2475d0]">Profile summary</p>
          <h3 className="mt-4 text-xl font-semibold">현재 의사결정 기준</h3>
          <dl className="mt-6 space-y-5 text-sm"><div><dt className="text-[#7b8292]">계약</dt><dd className="mt-1 font-semibold">{profile.contractType === "monthly" ? "월세" : "전세"}</dd></div><div><dt className="text-[#7b8292]">예산 상한</dt><dd className="mt-1 font-semibold">{profile.budget || "미입력"}만원</dd></div><div><dt className="text-[#7b8292]">우선 확인</dt><dd className="mt-2 flex flex-wrap gap-2">{profile.conditions.map((condition) => <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#52627b]" key={condition}>{CONDITION_LABELS[condition]}</span>)}</dd></div></dl>
          <p className="mt-8 border-t border-[#d7e3ef] pt-5 text-xs leading-5 text-[#738197]">현재 예산은 의사결정 프로필에 기록되며, 가격 원천 고도화 전까지 후보 카드의 실제 관측 가격을 함께 확인합니다.</p>
        </aside>
      </div>
    </section>
  );
}

function CandidateBoard({ exploration, profile, candidateStates, savedCandidates, error, isLoading, onUpdateCandidate, onCompare, onEditProfile }: {
  exploration: ExploreResponse | null; profile: DecisionProfile; candidateStates: Record<string, CandidateState>; savedCandidates: CandidateMatchRegion[]; error: string; isLoading: boolean;
  onUpdateCandidate: (regionId: string, state: CandidateState) => void; onCompare: () => void; onEditProfile: () => void;
}) {
  if (!exploration) return <section><PageIntro eyebrow="Candidate board" title="조건을 먼저 확인해 주세요" description="Decision Profile을 바탕으로 후보군을 구성합니다." /><button className="mt-6 rounded-lg bg-[#17203b] px-5 py-3 text-sm font-semibold text-white" onClick={onEditProfile} type="button">내 조건 설정</button></section>;
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-5"><PageIntro eyebrow="Candidate board" title="살펴볼 후보를 압축해 보세요" description="포함 근거와 주의사항을 확인하고 최종 비교 후보 2곳을 저장하세요." /><button className="rounded-lg border border-[#d7dce6] bg-white px-4 py-2.5 text-sm font-semibold text-[#4d5568]" onClick={onEditProfile} type="button">조건 수정</button></div>
      <div className="mt-7 grid gap-4 sm:grid-cols-3"><SummaryCard label="탐색 후보" value={`${exploration.regions.length}곳`} /><SummaryCard label="저장한 후보" value={`${savedCandidates.length}/2`} accent /><SummaryCard label="의사결정 기준" value={`${profile.conditions.length}개`} /></div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {exploration.regions.map((region) => <CandidateCard key={region.region_id} region={region} state={candidateStates[region.region_id]} onUpdate={onUpdateCandidate} />)}
      </div>
      {error ? <p className="mt-5 rounded-lg bg-[#fff3f2] px-4 py-3 text-sm text-[#b1453f]">{error}</p> : null}
      <div className="sticky bottom-4 mt-7 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#dce1e9] bg-white/95 p-4 shadow-[0_14px_40px_rgba(23,32,59,.12)] backdrop-blur sm:px-6"><div><p className="font-semibold">최종 후보 {savedCandidates.length}곳 선택</p><p className="mt-1 text-xs text-[#7b8292]">2곳을 저장하면 비교를 시작할 수 있습니다.</p></div><button className="rounded-lg bg-[#17203b] px-5 py-3 text-sm font-semibold text-white disabled:bg-[#b7bdc8]" disabled={savedCandidates.length !== 2 || isLoading} onClick={onCompare} type="button">{isLoading ? "근거 불러오는 중…" : "최종 후보 비교"}</button></div>
    </section>
  );
}

function SummaryCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) { return <div className={`rounded-xl border p-5 ${accent ? "border-[#b9dcfb] bg-[#edf7ff]" : "border-[#e0e4eb] bg-white"}`}><p className="text-xs text-[#818898]">{label}</p><p className={`mt-2 text-2xl font-semibold ${accent ? "text-[#1888e8]" : "text-[#17203b]"}`}>{value}</p></div>; }

function CandidateCard({ region, state, onUpdate }: { region: CandidateMatchRegion; state?: CandidateState; onUpdate: (regionId: string, state: CandidateState) => void }) {
  return <article className={`rounded-xl border bg-white p-6 transition ${state === "saved" ? "border-[#1888e8] ring-1 ring-[#1888e8]" : state === "excluded" ? "border-[#e1e4e9] opacity-55" : "border-[#e0e4eb]"}`}><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-medium text-[#818898]">{region.gu_name}</p><h3 className="mt-1 text-xl font-semibold">{region.dong_name}</h3></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${state === "saved" ? "bg-[#eaf4ff] text-[#1888e8]" : state === "excluded" ? "bg-[#f0f1f3] text-[#858b98]" : "bg-[#eef7f3] text-[#3c8065]"}`}>{state === "saved" ? "최종 후보" : state === "excluded" ? "제외됨" : "발견됨"}</span></div><div className="mt-5"><p className="text-xs font-semibold uppercase tracking-[.12em] text-[#8b92a1]">포함 근거</p><ul className="mt-3 space-y-2 text-sm leading-6 text-[#596174]">{Object.values(region.indicator_summary).slice(0, 3).map((summary) => <li className="flex gap-2" key={summary}><span className="text-[#1888e8]">•</span>{summary}</li>)}</ul></div><div className="mt-5 flex flex-wrap gap-2">{region.matched_indicators.map((indicator) => <span className="rounded-full border border-[#e0e4eb] px-2.5 py-1 text-xs text-[#687083]" key={indicator}>{indicator}</span>)}</div><div className="mt-6 grid grid-cols-2 gap-2"><button className={`rounded-lg border px-3 py-2.5 text-sm font-semibold ${state === "saved" ? "border-[#1888e8] bg-[#edf7ff] text-[#1888e8]" : "border-[#dce1e8] text-[#4f586b]"}`} onClick={() => onUpdate(region.region_id, "saved")} type="button">{state === "saved" ? "저장 취소" : "후보 저장"}</button><button className={`rounded-lg border px-3 py-2.5 text-sm font-semibold ${state === "excluded" ? "border-[#cfd4dc] bg-[#f1f2f4] text-[#777e8c]" : "border-[#dce1e8] text-[#757c8b]"}`} onClick={() => onUpdate(region.region_id, "excluded")} type="button">{state === "excluded" ? "제외 취소" : "제외"}</button></div></article>;
}
