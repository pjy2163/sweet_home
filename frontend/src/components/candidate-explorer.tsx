import { FormEvent, useMemo } from "react";

import {
  controlStyles,
  layoutStyles,
  textStyles,
} from "@/styles/components";
import type {
  CandidateMatchRegion,
  ExploreCondition,
  ExploreResponse,
} from "@/types/sweethome";

const CLOUD_PALETTE = [
  "#121d17",
  "#d94b86",
  "#8d2f73",
  "#ef9b3d",
  "#4f7562",
];

const CLOUD_POSITIONS = [
  { x: 34, y: -104 },
  { x: 168, y: -6 },
  { x: -12, y: 138 },
  { x: -170, y: 30 },
];

type ConditionOption = {
  id: ExploreCondition;
  label: string;
  description: string;
};

const CONDITION_OPTIONS: ConditionOption[] = [
  {
    id: "safety",
    label: "야간 환경",
    description: "안심 인프라와 야간 상권 분포",
  },
  {
    id: "convenience",
    label: "편의",
    description: "상권/생활편의 지표",
  },
  {
    id: "price",
    label: "가격",
    description: "서울 평균 이하 가격 지표",
  },
  {
    id: "population",
    label: "활동 특성",
    description: "주간·야간 체류인구",
  },
  {
    id: "transport",
    label: "교통",
    description: "원천 준비 중",
  },
];

type CandidateExplorerProps = {
  errorMessage: string;
  exploration: ExploreResponse | null;
  isExploring: boolean;
  onExplore: (event: FormEvent<HTMLFormElement>) => void;
  onToggleCondition: (condition: ExploreCondition) => void;
  selectedConditions: ExploreCondition[];
};

export function CandidateExplorer({
  errorMessage,
  exploration,
  isExploring,
  onExplore,
  onToggleCondition,
  selectedConditions,
}: CandidateExplorerProps) {
  return (
    <section className={`${layoutStyles.section} pb-20`} id="explore">
      <div className="mx-auto max-w-5xl">
        <div className={`${layoutStyles.borderedPanel} shadow-[0_26px_70px_rgba(18,29,23,0.07)]`}>
          <form className="p-8 sm:p-12 lg:p-16" onSubmit={onExplore}>
            <div className="mx-auto mb-10 max-w-3xl text-center">
              <p className={textStyles.eyebrow}>Explore</p>
              <h2 className={textStyles.sectionTitle}>후보지를 모르겠어요</h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#5e7069]">
                중요하게 볼 조건을 선택하면, 관련 데이터가 상대적으로 많이
                관측된 행정동 후보군을 보여줍니다
              </p>
            </div>

            <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
              {CONDITION_OPTIONS.map((condition) => {
                const checked = selectedConditions.includes(condition.id);

                return (
                  <label
                    className={`min-h-32 rounded-[1.5rem] border p-6 transition ${
                      checked
                        ? "border-[#121d17] bg-[#121d17] text-[#f5f4ee]"
                        : "border-[#d7e6df] bg-[#fbfefd] text-[#10231d] hover:border-[#173d31]"
                    }`}
                    key={condition.id}
                  >
                    <input
                      checked={checked}
                      className="sr-only"
                      onChange={() => onToggleCondition(condition.id)}
                      type="checkbox"
                    />
                    <span className="block text-2xl font-semibold">
                      {condition.label}
                    </span>
                    <span
                      className={`mt-3 block text-sm font-semibold leading-6 ${
                        checked ? "text-[#e6f6ef]" : "text-[#5e7069]"
                      }`}
                    >
                      {condition.description}
                    </span>
                  </label>
                );
              })}
            </div>

            {errorMessage ? (
              <p className={controlStyles.error}>{errorMessage}</p>
            ) : null}

            <button
              className={`${controlStyles.primaryButton} mx-auto max-w-3xl`}
              disabled={isExploring}
              type="submit"
            >
              {isExploring ? "후보군 확인 중" : "조건 기준 후보군 보기"}
            </button>
          </form>
        </div>
        <CandidateMatchList exploration={exploration} />
      </div>
    </section>
  );
}

function CandidateMatchList({
  exploration,
}: {
  exploration: ExploreResponse | null;
}) {
  if (!exploration) {
    return (
      <aside className="mt-5 rounded-[1.5rem] border border-[#d7e6df] bg-[#eef3ef] p-8 text-center sm:p-10">
        <p className={textStyles.eyebrow}>Candidate Match</p>
        <h3 className="mt-4 text-3xl font-normal leading-[1.14] tracking-[-0.045em]">조건을 선택해 주세요</h3>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[#5e7069]">
          후보군은 선택 조건과 연결된 지표가 많이 관측된 행정동입니다
          특정 지역을 추천하거나 우열을 판단하지 않습니다
        </p>
      </aside>
    );
  }

  return (
    <aside className="mt-5 rounded-[2rem] border border-[#d7e6df] bg-[#eef3ef] p-8 shadow-[0_24px_70px_rgba(18,29,23,0.06)] sm:p-12">
      <div className="text-center">
        <p className={textStyles.eyebrow}>Candidate Match</p>
        <h3 className="mt-4 text-3xl font-normal leading-[1.14] tracking-[-0.045em] sm:text-5xl">
          지역 후보군
        </h3>
        <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-[#5e7069]">
          {exploration.metadata.limitation}
        </p>
      </div>
      {exploration.regions.length ? (
        <>
          <CandidateCloud regions={exploration.regions} />
          <CandidateBriefReport exploration={exploration} />
          <ol className="mt-8 grid gap-4 md:grid-cols-2">
            {exploration.regions.map((region) => (
              <CandidateMatchItem key={region.region_id} region={region} />
            ))}
          </ol>
        </>
      ) : (
        <p className="mt-10 rounded-2xl border border-[#d7e6df] bg-white p-5 text-base font-semibold text-[#5e7069]">
          선택한 조건과 연결된 후보군이 아직 없습니다
          {exploration.selected_conditions.includes("transport")
            ? ` ${exploration.metadata.transport_status}`
            : ""}
        </p>
      )}
    </aside>
  );
}

function CandidateBriefReport({
  exploration,
}: {
  exploration: ExploreResponse;
}) {
  const topRegions = exploration.regions.slice(0, 3);
  const topRegionNames = topRegions
    .map((region) => region.display_name)
    .join(" · ");
  const matchedIndicatorCount = new Set(
    topRegions.flatMap((region) => region.matched_indicators),
  ).size;

  const conditionsParam = exploration.selected_conditions.join(",");
  const reportMapUrl = `/app/report-map?conditions=${encodeURIComponent(conditionsParam)}`;

  return (
    <div className="mt-8 rounded-3xl border border-[#d7e6df] bg-[#fbfcf8] p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#607068]">
            Brief Report
          </p>
          <h4 className="mt-3 text-2xl font-normal tracking-[-0.045em] text-[#121d17]">
            조건으로 좁힌 1차 후보 요약
          </h4>
        </div>
        <a
          className="inline-flex items-center gap-3 rounded-lg bg-[#121d17] px-4 py-3 text-sm font-bold text-[#f5f4ee] transition hover:bg-[#22352b]"
          href={reportMapUrl}
          rel="noreferrer"
          target="_blank"
        >
          상세 리포트 확인하기
          <span aria-hidden="true">↗</span>
        </a>
      </div>
      <dl className="mt-6 grid gap-4 text-sm text-[#5e7069] sm:grid-cols-3">
        <div className="rounded-2xl bg-[#eef3ef] p-4">
          <dt className="font-bold text-[#172019]">후보군</dt>
          <dd className="mt-2 text-2xl font-semibold text-[#121d17]">
            {exploration.regions.length}곳
          </dd>
        </div>
        <div className="rounded-2xl bg-[#eef3ef] p-4">
          <dt className="font-bold text-[#172019]">상위 후보</dt>
          <dd className="mt-2 leading-6">{topRegionNames}</dd>
        </div>
        <div className="rounded-2xl bg-[#eef3ef] p-4">
          <dt className="font-bold text-[#172019]">관측 지표</dt>
          <dd className="mt-2 text-2xl font-semibold text-[#121d17]">
            {matchedIndicatorCount}개
          </dd>
        </div>
      </dl>
      <p className="mt-5 text-sm leading-6 text-[#5e7069]">
        이 요약은 선택 조건과 연결된 데이터가 상대적으로 많이 관측된 지역을
        빠르게 훑기 위한 단계입니다. 상세 리포트는 새 화면에서 지도 중심으로
        후보군과 지표 흐름을 확인하는 구조로 확장합니다.
      </p>
    </div>
  );
}

function CandidateCloud({ regions }: { regions: CandidateMatchRegion[] }) {
  const visibleRegions = useMemo(() => regions.slice(0, 5), [regions]);
  const maxMatchCount = useMemo(
    () =>
      Math.max(
        ...visibleRegions.map((region) => region.match_count),
        1,
      ),
    [visibleRegions],
  );

  return (
    <div className="mt-8 overflow-hidden rounded-[2rem] border border-[#d7e6df] bg-[#fbfcf8] p-6 shadow-[0_24px_70px_rgba(18,29,23,0.07)] sm:p-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#607068]">
            Candidate Cloud
          </p>
          <h4 className="mt-3 text-2xl font-normal tracking-[-0.045em] text-[#121d17]">
            상위 후보 5곳 한눈에 보기
          </h4>
        </div>
      </div>
      <div className="candidate-orbit relative min-h-[360px] overflow-hidden rounded-[1.5rem] bg-[#fffdf8] p-4 text-center">
        {visibleRegions.map((region, index) => (
          <OrbitCandidate
            index={index}
            key={region.region_id}
            maxMatchCount={maxMatchCount}
            region={region}
          />
        ))}
      </div>
      <p className="mt-5 text-sm leading-6 text-[#5e7069]">
        큰 이름일수록 선택 조건과 연결된 지표가 더 많이 잡힌 행정동입니다.
        아래 카드에서 어떤 지표가 매칭됐는지 확인할 수 있습니다.
      </p>
    </div>
  );
}

function OrbitCandidate({
  index,
  maxMatchCount,
  region,
}: {
  index: number;
  maxMatchCount: number;
  region: CandidateMatchRegion;
}) {
  const weight = region.match_count / maxMatchCount;

  if (index === 0) {
    return (
      <a
        className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap transition hover:scale-105"
        href={`#candidate-${region.region_id}`}
        style={{ color: CLOUD_PALETTE[0] }}
        title={`${region.display_name} · 관련 지표 ${region.match_count}개`}
      >
        <strong className="text-[64px] font-black leading-none tracking-[-0.06em]">
          {region.dong_name}
        </strong>
      </a>
    );
  }

  const position = CLOUD_POSITIONS[index - 1] ?? { x: 0, y: 0 };
  const fontSize = Math.round(27 + weight * 15);
  const color = CLOUD_PALETTE[index % CLOUD_PALETTE.length];

  return (
    <a
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap transition hover:z-30 hover:scale-105"
      href={`#candidate-${region.region_id}`}
      style={{
        color,
        fontSize: `${fontSize}px`,
        left: `calc(50% + ${position.x}px)`,
        top: `calc(50% + ${position.y}px)`,
      }}
      title={`${region.display_name} · 관련 지표 ${region.match_count}개`}
    >
      <strong className="font-black leading-none tracking-[-0.05em]">
        {region.dong_name}
      </strong>
    </a>
  );
}

function CandidateMatchItem({ region }: { region: CandidateMatchRegion }) {
  return (
    <li
      className="rounded-2xl border border-[#d7e6df] bg-[#fbfcf8] p-5"
      id={`candidate-${region.region_id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xl font-semibold">{region.display_name}</p>
          <p className="mt-2 text-sm font-semibold text-[#527367]">
            관련 지표 {region.match_count}개 관측
          </p>
        </div>
        <span className="rounded-full border border-[#173d31] bg-[#eef5ed] px-3 py-1 text-sm font-bold text-[#173d31]">
          {region.match_count}
        </span>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {region.matched_indicators.map((indicator) => (
          <span
            className="rounded-full border border-[#cfe3da] bg-white px-3 py-1 text-sm font-bold text-[#47645a]"
            key={indicator}
          >
            {indicator}
          </span>
        ))}
      </div>
      <ul className="mt-5 grid gap-2 text-sm font-semibold leading-6 text-[#5e7069]">
        {Object.entries(region.indicator_summary).map(([condition, summary]) => (
          <li key={condition}>{summary}</li>
        ))}
      </ul>
    </li>
  );
}
