"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { AuthMenu } from "@/components/auth-menu";
import { ComparisonResult } from "@/components/comparison-result";
import { RegionSearchCombobox } from "@/components/region-search-combobox";
import { SingleRegionResult } from "@/components/single-region-result";
import { fetchCandidateMatches, fetchComparison, fetchRegions } from "@/lib/api";
import type {
  CandidateMatchRegion,
  CompareResponse,
  ExploreCondition,
  ExploreResponse,
  HousingAreaBand,
  HousingBuildingType,
  RegionOption,
} from "@/types/sweethome";

type WorkspaceStep = "entry" | "profile" | "candidates" | "comparison";
type CandidateState = "saved" | "excluded";
type ExclusionReason = "budget" | "transport" | "night_environment" | "convenience" | "housing" | "other";
type EntryMode = "known" | "unknown";

type DecisionProfile = {
  contractType: "monthly" | "jeonse";
  budget: string;
  buildingType: HousingBuildingType | "any";
  areaBand: HousingAreaBand | "any";
  conditions: ExploreCondition[];
};

const MAX_SAVED_CANDIDATES = 3;
const MAX_COMPARISON_CANDIDATES = 2;
const DEFAULT_PROFILE: DecisionProfile = {
  contractType: "monthly",
  budget: "80",
  buildingType: "any",
  areaBand: "any",
  conditions: ["price", "convenience"],
};

const CONDITION_OPTIONS: Array<{
  id: ExploreCondition;
  label: string;
  description: string;
}> = [
  { id: "price", label: "주거 비용", description: "서울 평균 대비 가격 수준" },
  { id: "convenience", label: "생활 편의", description: "일상 상권과 편의시설" },
  { id: "safety", label: "야간 생활환경", description: "안심 인프라와 야간 상권 분포" },
  { id: "population", label: "거주·활동 특성", description: "주간·야간 체류인구의 차이" },
  { id: "transport", label: "교통 접근성", description: "지하철역과 버스정류소의 정적 위치" },
];

const CONDITION_LABELS: Record<ExploreCondition, string> = {
  price: "주거 비용",
  convenience: "생활 편의",
  safety: "야간 생활환경",
  population: "거주·활동 특성",
  transport: "교통 접근성",
};

export function DecisionWorkspace() {
  const [step, setStep] = useState<WorkspaceStep>("entry");
  const [entryMode, setEntryMode] = useState<EntryMode>("unknown");
  const [profile, setProfile] = useState<DecisionProfile>(DEFAULT_PROFILE);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [directRegionIds, setDirectRegionIds] = useState<[string, string]>(["", ""]);
  const [exploration, setExploration] = useState<ExploreResponse | null>(null);
  const [candidateStates, setCandidateStates] = useState<Record<string, CandidateState>>({});
  const [candidateNotes, setCandidateNotes] = useState<Record<string, string>>({});
  const [exclusionReasons, setExclusionReasons] = useState<Record<string, ExclusionReason>>({});
  const [comparisonRegionIds, setComparisonRegionIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<CompareResponse | null>(null);
  const [singleRegion, setSingleRegion] = useState<CandidateMatchRegion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchRegions().then(setRegions).catch(() => setRegions([]));
  }, []);

  useEffect(() => {
    if (step === "comparison") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step]);

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
    const selectedDirectRegionIds = directRegionIds.filter(Boolean);
    if (!profile.conditions.length) {
      setError("의사결정 기준을 하나 이상 선택해 주세요.");
      return;
    }
    if (!profile.budget || Number(profile.budget) <= 0) {
      setError("예산 상한을 0보다 큰 금액으로 입력해 주세요.");
      return;
    }
    if (entryMode === "known" && selectedDirectRegionIds.length === 0) {
      setError("알고 있는 후보 지역을 한 곳 이상 선택해 주세요.");
      return;
    }
    if (entryMode === "known" && directRegionIds[0] === directRegionIds[1]) {
      setError("서로 다른 후보 지역을 선택해 주세요.");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      const options = {
        excludeLowVolumePrice: profile.conditions.includes("price"),
        contractType: profile.contractType === "monthly" ? "monthly_rent" as const : "jeonse" as const,
        budgetMaxKrw10k: Number(profile.budget),
        buildingType: profile.buildingType === "any" ? undefined : profile.buildingType,
        areaBand: profile.areaBand === "any" ? undefined : profile.areaBand,
      };
      let result: ExploreResponse;

      if (entryMode === "known") {
        setCandidateStates({});
        setCandidateNotes({});
        setExclusionReasons({});

        if (selectedDirectRegionIds.length === 2) {
          const directComparison = await fetchComparison(
            selectedDirectRegionIds[0],
            selectedDirectRegionIds[1],
          );
          setExploration(null);
          setComparisonRegionIds(selectedDirectRegionIds);
          setSingleRegion(null);
          setComparison(directComparison);
          setStep("comparison");
          return;
        }

        const directResult = await fetchCandidateMatches(profile.conditions, 8, {
          contractType: options.contractType,
          regionIds: selectedDirectRegionIds,
        });
        if (directResult.regions.length < selectedDirectRegionIds.length) {
          setError("선택한 후보의 분석 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
          return;
        }

        setExploration(directResult);
        setComparisonRegionIds([]);
        setComparison(null);
        setSingleRegion(directResult.regions[0]);
        setStep("comparison");
        return;
      } else {
        result = await fetchCandidateMatches(profile.conditions, 8, options);
      }
      setCandidateStates({});
      setCandidateNotes({});
      setExclusionReasons({});
      setComparisonRegionIds([]);
      setComparison(null);
      setSingleRegion(null);
      setExploration(result);
      setStep("candidates");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "후보를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  function updateCandidate(regionId: string, state: CandidateState) {
    const isRemoving = candidateStates[regionId] === state;
    if (!isRemoving && state === "saved") {
      const savedCount = Object.values(candidateStates).filter((value) => value === "saved").length;
      if (savedCount >= MAX_SAVED_CANDIDATES) {
        setError("검토 후보는 최대 3곳까지 저장할 수 있습니다.");
        return;
      }
    }

    setError("");
    setCandidateStates((current) => {
      const next = { ...current };
      if (isRemoving) delete next[regionId];
      else next[regionId] = state;
      return next;
    });
    if (state === "excluded" || isRemoving) {
      setComparisonRegionIds((ids) => ids.filter((id) => id !== regionId));
    }
  }

  function toggleComparisonCandidate(regionId: string) {
    setComparisonRegionIds((current) => {
      if (current.includes(regionId)) {
        setError("");
        return current.filter((id) => id !== regionId);
      }
      if (current.length >= MAX_COMPARISON_CANDIDATES) {
        setError("최종 비교 후보는 2곳만 선택할 수 있습니다.");
        return current;
      }
      setError("");
      return [...current, regionId];
    });
  }

  async function compareFinalists() {
    if (comparisonRegionIds.length !== 2) return;
    setError("");
    setIsLoading(true);
    try {
      setSingleRegion(null);
      setComparison(
        await fetchComparison(
          comparisonRegionIds[0],
          comparisonRegionIds[1],
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
    <main className="decision-workspace warm-canvas min-h-screen text-ink">
      <WorkspaceSidebar step={step} onStepChange={setStep} />
      <div className="min-h-screen lg:pl-[260px]">
        <header className="flex min-h-16 items-center justify-between border-b border-line bg-white/80 px-5 backdrop-blur-xl sm:px-8 lg:px-12">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.08em] text-[#8a91a3]">주거 후보 비교</p>
            <p className="mt-1 text-sm text-[#5f6678]">서울 행정동 · 최신 가용 데이터 기준</p>
          </div>
          <span className="rounded-full bg-sage-soft px-3 py-1.5 text-xs font-semibold text-sage">서울 행정동</span>
        </header>

        <div className="mx-auto max-w-[1180px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
          {step === "entry" ? (
            <EntryPanel onSelect={(mode) => { setEntryMode(mode); setError(""); setStep("profile"); }} />
          ) : null}
          {step === "profile" ? (
            <DecisionProfilePanel
              directRegionIds={directRegionIds}
              entryMode={entryMode}
              error={error}
              isLoading={isLoading}
              onContinue={discoverCandidates}
              onContractChange={(contractType) => setProfile((current) => ({
                ...current,
                contractType,
                budget: contractType === "monthly" ? "80" : "20000",
              }))}
              onBudgetChange={(budget) => setProfile((current) => ({ ...current, budget }))}
              onBuildingTypeChange={(buildingType) => setProfile((current) => ({ ...current, buildingType }))}
              onAreaBandChange={(areaBand) => setProfile((current) => ({ ...current, areaBand }))}
              onDirectRegionChange={(index, regionId) => setDirectRegionIds((current) => index === 0 ? [regionId, current[1]] : [current[0], regionId])}
              onEntryBack={() => setStep("entry")}
              onToggleCondition={toggleCondition}
              profile={profile}
              regions={regions}
            />
          ) : null}
          {step === "candidates" ? (
            <CandidateBoard
              candidateStates={candidateStates}
              candidateNotes={candidateNotes}
              comparisonRegionIds={comparisonRegionIds}
              exclusionReasons={exclusionReasons}
              error={error}
              exploration={exploration}
              isLoading={isLoading}
              onCompare={compareFinalists}
              onComparisonToggle={toggleComparisonCandidate}
              onEditProfile={() => setStep("profile")}
              onExclusionReasonChange={(regionId, reason) => setExclusionReasons((current) => ({ ...current, [regionId]: reason }))}
              onNoteChange={(regionId, note) => setCandidateNotes((current) => ({ ...current, [regionId]: note }))}
              onUpdateCandidate={updateCandidate}
              profile={profile}
              savedCandidates={savedCandidates}
            />
          ) : null}
          {step === "comparison" ? (
            <div>
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <PageIntro eyebrow={singleRegion ? "후보 한 곳 살펴보기" : "선택 후보 비교"} title={singleRegion ? "알고 있는 후보를 크게 살펴봅니다" : "내가 고른 조건만 집중해서 비교합니다"} description={singleRegion ? "선택한 한 지역의 데이터 근거와 다음 확인 항목을 봅니다." : "관측된 차이와 지도에서 다시 확인할 항목을 분리해 봅니다."} />
                <button className="rounded-lg border border-[#dfe8e3] bg-white px-4 py-2.5 text-sm font-semibold text-[#4d5568]" onClick={() => setStep(entryMode === "known" ? "profile" : "candidates")} type="button">{entryMode === "known" ? "← 후보 다시 선택" : "← 후보 보드"}</button>
              </div>
              {singleRegion ? (
                <SingleRegionResult mapHref={buildReportMapUrl(profile, [singleRegion], true)} region={singleRegion} selectedConditions={profile.conditions} />
              ) : (
                <ComparisonResult comparison={comparison} mapHref={buildReportMapUrl(profile, comparisonRegionIds, true)} selectedConditions={profile.conditions} />
              )}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function WorkspaceSidebar({ step, onStepChange }: { step: WorkspaceStep; onStepChange: (step: WorkspaceStep) => void }) {
  const items: Array<{ id: WorkspaceStep; label: string; number: string }> = [
    { id: "entry", label: "시작", number: "01" },
    { id: "profile", label: "내 조건", number: "02" },
    { id: "candidates", label: "후보 보드", number: "03" },
    { id: "comparison", label: "지역 비교", number: "04" },
  ];
  return (
    <aside className="hidden border-r border-line bg-white/88 backdrop-blur-xl lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-[260px] lg:flex-col">
      <Link className="flex h-24 items-center border-b border-line px-8" href="/" aria-label="SweetHome 홈">
        <BrandLogo />
      </Link>
      <div className="px-8 py-9">
        <p className="text-[11px] font-semibold tracking-[0.08em] text-[#a0a6b4]">비교 과정</p>
        <h1 className="mt-3 text-2xl font-medium tracking-[-0.03em]">주거 의사결정</h1>
      </div>
      <nav className="px-4">
        {items.map((item) => (
          <button
            className={`mb-1 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition ${step === item.id ? "bg-sage-soft font-semibold text-sage" : "text-[#666e80] hover:bg-surface-soft"}`}
            key={item.id}
            onClick={() => onStepChange(item.id)}
            type="button"
          >
            <span className="text-[10px] text-current opacity-70">{item.number}</span>{item.label}
          </button>
        ))}
      </nav>
      <div className="mt-auto">
        <div className="border-t border-line p-4">
          <AuthMenu className="block rounded-lg px-4 py-3 text-sm font-semibold text-[#666e80] transition hover:bg-surface-soft" />
        </div>
        <div className="border-t border-line p-6 text-xs leading-5 text-[#8a91a3]">AI가 결정을 대신하지 않습니다.<br />근거를 정리해 판단을 돕습니다.</div>
      </div>
    </aside>
  );
}

function EntryPanel({ onSelect }: { onSelect: (mode: EntryMode) => void }) {
  return (
    <section>
      <PageIntro eyebrow="비교 시작하기" title="지금 어떤 단계에 있나요?" description="후보가 있다면 직접 추가하고, 아직 없다면 내 조건으로 서울의 후보 지역을 찾아보세요." />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <button className="min-h-64 rounded-xl border border-line bg-white p-7 text-left shadow-[0_8px_24px_rgba(67,62,63,.05)] transition hover:border-sage" onClick={() => onSelect("known")} type="button">
          <span className="text-xs font-semibold tracking-[.06em] text-sage">후보 지역이 있어요</span>
          <strong className="mt-14 block text-2xl font-medium tracking-[-.035em]">고민 중인 지역이 있어요</strong>
          <span className="mt-4 block max-w-sm text-sm leading-6 text-[#697184]">후보 한 곳은 상세하게 살펴보고, 두 곳은 같은 조건으로 바로 비교합니다.</span>
        </button>
        <button className="min-h-64 rounded-xl border border-line bg-white p-7 text-left shadow-[0_8px_24px_rgba(67,62,63,.05)] transition hover:border-sage" onClick={() => onSelect("unknown")} type="button">
          <span className="text-xs font-semibold tracking-[.06em] text-sage">조건으로 찾아볼게요</span>
          <strong className="mt-14 block text-2xl font-medium tracking-[-.035em]">어디부터 볼지 모르겠어요</strong>
          <span className="mt-4 block max-w-sm text-sm leading-6 text-[#697184]">예산과 생활 조건을 입력해 살펴볼 행정동 후보를 좁힙니다.</span>
        </button>
      </div>
    </section>
  );
}

function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sage">{eyebrow}</p><h2 className="mt-3 text-3xl font-medium tracking-[-0.035em] sm:text-4xl">{title}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6d7485] sm:text-base">{description}</p></div>;
}

function DecisionProfilePanel({ profile, entryMode, regions, directRegionIds, error, isLoading, onContractChange, onBudgetChange, onBuildingTypeChange, onAreaBandChange, onDirectRegionChange, onEntryBack, onToggleCondition, onContinue }: {
  profile: DecisionProfile; entryMode: EntryMode; regions: RegionOption[]; directRegionIds: [string, string]; error: string; isLoading: boolean;
  onContractChange: (value: DecisionProfile["contractType"]) => void;
  onBudgetChange: (value: string) => void;
  onBuildingTypeChange: (value: DecisionProfile["buildingType"]) => void;
  onAreaBandChange: (value: DecisionProfile["areaBand"]) => void;
  onDirectRegionChange: (index: 0 | 1, regionId: string) => void;
  onEntryBack: () => void;
  onToggleCondition: (value: ExploreCondition) => void;
  onContinue: () => void;
}) {
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageIntro eyebrow="내 조건" title="어떤 집을 찾고 계신가요?" description="조건을 구조화하면 동일한 기준으로 살펴볼 지역을 좁힐 수 있습니다." />
        <button className="rounded-lg border border-[#dfe8e3] bg-white px-4 py-2.5 text-sm font-semibold text-[#596174]" onClick={onEntryBack} type="button">← 시작 방식 변경</button>
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <div className="rounded-xl border border-line bg-white p-6 shadow-[0_6px_20px_rgba(67,62,63,.04)] sm:p-8">
          {entryMode === "known" ? (
            <fieldset className="mb-8 border-b border-[#edf2ef] pb-8">
              <legend className="text-sm font-semibold">알고 있는 후보 지역 <span className="font-normal text-[#8b92a1]">· 한 곳 이상</span></legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {[0, 1].map((index) => (
                  <RegionSearchCombobox
                    excludedRegionId={directRegionIds[index === 0 ? 1 : 0] || undefined}
                    key={index}
                    label={index === 0 ? "첫 번째 후보" : "두 번째 후보 · 선택 사항"}
                    onChange={(regionId) => onDirectRegionChange(index as 0 | 1, regionId)}
                    regions={regions}
                    value={directRegionIds[index]}
                  />
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-[#7d8595]">강남, 망원처럼 이름으로 찾거나 ㄱㄴ, ㅁㅇ처럼 초성으로 검색할 수 있습니다.</p>
            </fieldset>
          ) : null}
          <fieldset>
            <legend className="text-sm font-semibold">계약 유형</legend>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {(["monthly", "jeonse"] as const).map((type) => <button aria-pressed={profile.contractType === type} className={`rounded-lg border px-4 py-4 text-sm font-semibold ${profile.contractType === type ? "border-sage bg-sage-soft text-sage-strong" : "border-line text-[#5f6678]"}`} key={type} onClick={() => onContractChange(type)} type="button">{type === "monthly" ? "월세" : "전세"}</button>)}
            </div>
          </fieldset>
          <label className="mt-7 block text-sm font-semibold" htmlFor="budget">{profile.contractType === "monthly" ? "월세 상한 · 관리비 제외" : "전세 보증금 상한"}</label>
          <div className="mt-3 flex items-center rounded-lg border border-line bg-white px-4 focus-within:border-sage">
            <input className="h-14 min-w-0 flex-1 outline-none" id="budget" inputMode="numeric" onChange={(event) => onBudgetChange(event.target.value.replace(/[^0-9]/g, ""))} value={profile.budget} />
            <span className="text-sm text-[#737b8d]">만원</span>
          </div>
          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-semibold">주택유형
              <select className="mt-3 h-14 w-full rounded-lg border border-line bg-white px-4 text-sm font-normal outline-none focus:border-sage" onChange={(event) => onBuildingTypeChange(event.target.value as DecisionProfile["buildingType"])} value={profile.buildingType}>
                <option value="any">전체 유형</option><option value="apartment">아파트</option><option value="officetel">오피스텔</option><option value="multi_family">연립·다세대</option><option value="detached_multiunit">단독·다가구</option>
              </select>
            </label>
            <label className="text-sm font-semibold">면적구간
              <select className="mt-3 h-14 w-full rounded-lg border border-line bg-white px-4 text-sm font-normal outline-none focus:border-sage" onChange={(event) => onAreaBandChange(event.target.value as DecisionProfile["areaBand"])} value={profile.areaBand}>
                <option value="any">전체 면적</option><option value="compact">소형</option><option value="mid_size">중형</option><option value="large">대형</option>
              </select>
            </label>
          </div>
          <fieldset className="mt-8">
            <legend className="text-sm font-semibold">중요하게 볼 조건 <span className="font-normal text-[#8b92a1]">· 복수 선택</span></legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {CONDITION_OPTIONS.map((condition) => { const selected = profile.conditions.includes(condition.id); return <button aria-pressed={selected} className={`rounded-lg border p-4 text-left transition ${selected ? "border-sage bg-sage-soft" : "border-line hover:border-[#aeb6c5]"}`} key={condition.id} onClick={() => onToggleCondition(condition.id)} type="button"><span className="flex items-center justify-between font-semibold"><span>{condition.label}</span><span className={`grid h-5 w-5 place-items-center rounded-full text-xs ${selected ? "bg-sage text-white" : "border border-[#cbd1dc]"}`}>{selected ? "✓" : ""}</span></span><span className="mt-2 block text-xs leading-5 text-[#7b8292]">{condition.description}</span></button>; })}
            </div>
          </fieldset>
          {error ? <p className="mt-5 rounded-lg bg-[#fff3f2] px-4 py-3 text-sm text-[#b1453f]">{error}</p> : null}
          <button className="mt-8 h-13 w-full rounded-lg bg-ink px-5 font-semibold text-white transition hover:bg-charcoal disabled:bg-[#a6adba]" disabled={isLoading} onClick={onContinue} type="button">{isLoading ? "데이터 불러오는 중…" : entryMode === "known" ? "선택한 후보 분석" : "조건 확인하고 후보 탐색"}</button>
        </div>
        <aside className="rounded-xl border border-sage-soft bg-sage-soft p-6 sm:p-8">
          <p className="text-xs font-semibold tracking-[0.06em] text-sage">입력한 조건</p>
          <h3 className="mt-4 text-xl font-semibold">현재 의사결정 기준</h3>
          <dl className="mt-6 space-y-5 text-sm"><div><dt className="text-[#7b8292]">계약</dt><dd className="mt-1 font-semibold">{profile.contractType === "monthly" ? "월세" : "전세"}</dd></div><div><dt className="text-[#7b8292]">예산 상한</dt><dd className="mt-1 font-semibold">{profile.budget || "미입력"}만원</dd></div><div><dt className="text-[#7b8292]">주거 조건</dt><dd className="mt-1 font-semibold">{profile.buildingType === "any" ? "전체 유형" : { apartment: "아파트", officetel: "오피스텔", multi_family: "연립·다세대", detached_multiunit: "단독·다가구" }[profile.buildingType]} · {profile.areaBand === "any" ? "전체 면적" : { compact: "소형", mid_size: "중형", large: "대형" }[profile.areaBand]}</dd></div><div><dt className="text-[#7b8292]">우선 확인</dt><dd className="mt-2 flex flex-wrap gap-2">{profile.conditions.map((condition) => <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#52627b]" key={condition}>{CONDITION_LABELS[condition]}</span>)}</dd></div></dl>
          <p className="mt-8 border-t border-sage-soft pt-5 text-xs leading-5 text-[#738197]">월세 예산에는 관리비가 포함되지 않습니다. 전체 유형이나 전체 면적을 선택하면 비교 가능한 세부 주거유형 중 예산 이내 사례가 있는 지역을 보여줍니다.</p>
        </aside>
      </div>
    </section>
  );
}

function CandidateBoard({ exploration, profile, candidateStates, candidateNotes, comparisonRegionIds, exclusionReasons, savedCandidates, error, isLoading, onUpdateCandidate, onComparisonToggle, onExclusionReasonChange, onNoteChange, onCompare, onEditProfile }: {
  exploration: ExploreResponse | null; profile: DecisionProfile; candidateStates: Record<string, CandidateState>; candidateNotes: Record<string, string>; comparisonRegionIds: string[]; exclusionReasons: Record<string, ExclusionReason>; savedCandidates: CandidateMatchRegion[]; error: string; isLoading: boolean;
  onUpdateCandidate: (regionId: string, state: CandidateState) => void; onComparisonToggle: (regionId: string) => void; onExclusionReasonChange: (regionId: string, reason: ExclusionReason) => void; onNoteChange: (regionId: string, note: string) => void; onCompare: () => void; onEditProfile: () => void;
}) {
  if (!exploration) return <section><PageIntro eyebrow="후보 지역" title="조건을 먼저 확인해 주세요" description="입력한 조건을 바탕으로 후보 지역을 구성합니다." /><button className="mt-6 rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white" onClick={onEditProfile} type="button">내 조건 설정</button></section>;
  const mapUrl = buildReportMapUrl(profile, savedCandidates);
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-5"><PageIntro eyebrow="후보 지역" title="살펴볼 후보를 압축해 보세요" description="최대 3곳을 검토하며 판단 메모를 남기고, 그중 비교할 2곳을 선택하세요." /><div className="flex gap-2"><Link className="rounded-lg border border-sage-line bg-sage-soft px-4 py-2.5 text-sm font-semibold text-sage-strong" href={mapUrl}>지도에서 보기 ↗</Link><button className="rounded-lg border border-[#dfe8e3] bg-white px-4 py-2.5 text-sm font-semibold text-[#4d5568]" onClick={onEditProfile} type="button">조건 수정</button></div></div>
      <div className="mt-7 grid gap-4 sm:grid-cols-3"><SummaryCard label="탐색 후보" value={`${exploration.regions.length}곳`} /><SummaryCard label="검토 후보" value={`${savedCandidates.length}/3`} accent /><SummaryCard label="비교 선택" value={`${comparisonRegionIds.length}/2`} /></div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {exploration.regions.map((region) => <CandidateCard candidateNote={candidateNotes[region.region_id] ?? ""} exclusionReason={exclusionReasons[region.region_id]} isComparisonCandidate={comparisonRegionIds.includes(region.region_id)} key={region.region_id} region={region} state={candidateStates[region.region_id]} onComparisonToggle={onComparisonToggle} onExclusionReasonChange={onExclusionReasonChange} onNoteChange={onNoteChange} onUpdate={onUpdateCandidate} />)}
      </div>
      {error ? <p className="mt-5 rounded-lg bg-[#fff3f2] px-4 py-3 text-sm text-[#b1453f]">{error}</p> : null}
      <div className="sticky bottom-4 mt-7 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#dce1e9] bg-white/95 p-4 shadow-[0_14px_40px_rgba(67,62,63,.12)] backdrop-blur sm:px-6"><div><p className="font-semibold">비교 후보 {comparisonRegionIds.length}/2 선택</p><p className="mt-1 text-xs text-[#7b8292]">검토 후보는 3곳까지, 최종 비교는 2곳을 선택합니다.</p></div><button className="rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white disabled:bg-[#b7bdc8]" disabled={comparisonRegionIds.length !== 2 || isLoading} onClick={onCompare} type="button">{isLoading ? "근거 불러오는 중…" : "선택한 2곳 비교"}</button></div>
    </section>
  );
}

function SummaryCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) { return <div className={`rounded-xl border p-5 ${accent ? "border-sage-line bg-sage-soft" : "border-line bg-white"}`}><p className="text-xs text-[#818898]">{label}</p><p className={`mt-2 text-2xl font-semibold ${accent ? "text-sage" : "text-ink"}`}>{value}</p></div>; }

function CandidateCard({ region, state, candidateNote, exclusionReason, isComparisonCandidate, onUpdate, onComparisonToggle, onExclusionReasonChange, onNoteChange }: { region: CandidateMatchRegion; state?: CandidateState; candidateNote: string; exclusionReason?: ExclusionReason; isComparisonCandidate: boolean; onUpdate: (regionId: string, state: CandidateState) => void; onComparisonToggle: (regionId: string) => void; onExclusionReasonChange: (regionId: string, reason: ExclusionReason) => void; onNoteChange: (regionId: string, note: string) => void }) {
  const statusLabel = state === "excluded" ? "제외됨" : isComparisonCandidate ? "비교 선택" : state === "saved" ? "검토 중" : "발견됨";
  return (
    <article className={`rounded-xl border bg-white p-6 transition ${isComparisonCandidate ? "border-sage ring-1 ring-sage" : state === "saved" ? "border-sage-line" : state === "excluded" ? "border-[#e1e4e9] bg-[#fafafa]" : "border-line"}`}>
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-medium text-[#818898]">{region.gu_name}</p><h3 className="mt-1 text-xl font-semibold">{region.dong_name}</h3></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${isComparisonCandidate ? "bg-sage text-white" : state === "saved" ? "bg-sage-soft text-sage" : state === "excluded" ? "bg-[#f0f1f3] text-[#858b98]" : "bg-[#eef7f3] text-[#3c8065]"}`}>{statusLabel}</span></div>
      <div className="mt-5"><p className="text-xs font-semibold uppercase tracking-[.12em] text-[#8b92a1]">포함 근거</p><ul className="mt-3 space-y-2 text-sm leading-6 text-[#596174]">{Object.values(region.indicator_summary).slice(0, 3).map((summary) => <li className="flex gap-2" key={summary}><span className="text-sage">•</span>{summary}</li>)}</ul></div>
      <div className="mt-5 flex flex-wrap gap-2">{region.matched_indicators.map((indicator) => <span className="rounded-full border border-line px-2.5 py-1 text-xs text-[#687083]" key={indicator}>{indicator}</span>)}</div>
      {state === "excluded" ? <label className="mt-5 block text-xs font-semibold text-[#737b8d]">제외 이유<select className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm font-normal" onChange={(event) => onExclusionReasonChange(region.region_id, event.target.value as ExclusionReason)} value={exclusionReason ?? "other"}><option value="budget">비용 조건</option><option value="transport">교통 접근성</option><option value="night_environment">야간 생활환경</option><option value="convenience">생활 편의</option><option value="housing">주택 조건</option><option value="other">기타</option></select></label> : null}
      {(state === "saved" || state === "excluded") ? <label className="mt-5 block text-xs font-semibold text-[#737b8d]">판단 메모<textarea className="mt-2 min-h-20 w-full resize-y rounded-lg border border-line bg-white p-3 text-sm font-normal leading-5 outline-none focus:border-sage" maxLength={180} onChange={(event) => onNoteChange(region.region_id, event.target.value)} placeholder="직접 확인할 내용이나 판단 이유를 남겨보세요." value={candidateNote} /></label> : null}
      <div className={`mt-6 grid gap-2 ${state === "saved" ? "grid-cols-3" : "grid-cols-2"}`}><button className={`rounded-lg border px-3 py-2.5 text-sm font-semibold ${state === "saved" ? "border-sage-line bg-sage-soft text-sage" : "border-line text-[#4f586b]"}`} onClick={() => onUpdate(region.region_id, "saved")} type="button">{state === "saved" ? "검토 취소" : "검토 추가"}</button>{state === "saved" ? <button className={`rounded-lg border px-3 py-2.5 text-sm font-semibold ${isComparisonCandidate ? "border-sage bg-sage text-white" : "border-line text-[#4f586b]"}`} onClick={() => onComparisonToggle(region.region_id)} type="button">{isComparisonCandidate ? "비교 해제" : "비교 선택"}</button> : null}<button className={`rounded-lg border px-3 py-2.5 text-sm font-semibold ${state === "excluded" ? "border-[#cfd4dc] bg-[#f1f2f4] text-[#777e8c]" : "border-line text-[#757c8b]"}`} onClick={() => onUpdate(region.region_id, "excluded")} type="button">{state === "excluded" ? "제외 취소" : "제외"}</button></div>
    </article>
  );
}

function buildReportMapUrl(profile: DecisionProfile, candidates: CandidateMatchRegion[] | string[], focusOnly = false) {
  const params = new URLSearchParams({
    conditions: profile.conditions.join(","),
    contract_type: profile.contractType === "monthly" ? "monthly_rent" : "jeonse",
    budget_max_krw_10k: profile.budget,
  });
  if (profile.buildingType !== "any") params.set("building_type", profile.buildingType);
  if (profile.areaBand !== "any") params.set("area_band", profile.areaBand);
  const candidateIds = candidates.map((candidate) => typeof candidate === "string" ? candidate : candidate.region_id);
  if (candidateIds.length) params.set("saved", candidateIds.join(","));
  if (focusOnly && candidates.length) params.set("focus", "true");
  return `/app/report-map?${params.toString()}`;
}
