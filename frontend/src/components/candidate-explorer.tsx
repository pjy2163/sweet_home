import { FormEvent } from "react";

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

type ConditionOption = {
  id: ExploreCondition;
  label: string;
  description: string;
};

const CONDITION_OPTIONS: ConditionOption[] = [
  {
    id: "safety",
    label: "안전",
    description: "안전 대체 지표",
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
    label: "인구",
    description: "생활인구 지표",
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
      <div className={layoutStyles.borderedPanel}>
        <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
          <form className={layoutStyles.panelPadding} onSubmit={onExplore}>
            <div className="mb-10">
              <p className={textStyles.eyebrow}>Explore</p>
              <h2 className={textStyles.sectionTitle}>후보지를 모르겠어요</h2>
              <p className="mt-5 text-base font-semibold leading-7 text-neutral-600">
                중요하게 볼 조건을 선택하면, 관련 데이터가 상대적으로 많이
                관측된 행정동 후보군을 보여줍니다.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {CONDITION_OPTIONS.map((condition) => {
                const checked = selectedConditions.includes(condition.id);

                return (
                  <label
                    className={`min-h-28 border p-5 transition ${
                      checked
                        ? "border-neutral-950 bg-neutral-950 text-white"
                        : "border-neutral-300 bg-white text-neutral-950"
                    }`}
                    key={condition.id}
                  >
                    <input
                      checked={checked}
                      className="sr-only"
                      onChange={() => onToggleCondition(condition.id)}
                      type="checkbox"
                    />
                    <span className="block text-2xl font-black">
                      {condition.label}
                    </span>
                    <span
                      className={`mt-3 block text-sm font-semibold leading-6 ${
                        checked ? "text-neutral-200" : "text-neutral-600"
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
              className={controlStyles.primaryButton}
              disabled={isExploring}
              type="submit"
            >
              {isExploring ? "후보군 확인 중" : "조건 기준 후보군 보기"}
            </button>
          </form>

          <CandidateMatchList exploration={exploration} />
        </div>
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
      <aside className="border-t border-neutral-300 bg-neutral-50 p-8 sm:p-12 lg:border-l lg:border-t-0">
        <p className={textStyles.eyebrow}>Candidate Match</p>
        <h3 className="mt-4 text-4xl font-black">조건을 선택해 주세요</h3>
        <p className="mt-8 text-base font-semibold leading-7 text-neutral-600">
          후보군은 선택 조건과 연결된 지표가 많이 관측된 행정동입니다.
          특정 지역을 추천하거나 우열을 판단하지 않습니다.
        </p>
      </aside>
    );
  }

  return (
    <aside className="border-t border-neutral-300 bg-neutral-50 p-8 sm:p-12 lg:border-l lg:border-t-0">
      <p className={textStyles.eyebrow}>Candidate Match</p>
      <h3 className="mt-4 text-4xl font-black">
        {exploration.regions.length}개 후보군
      </h3>
      <p className="mt-6 text-base font-semibold leading-7 text-neutral-600">
        {exploration.metadata.limitation}
      </p>
      {exploration.regions.length ? (
        <ol className="mt-10 grid gap-4">
          {exploration.regions.map((region) => (
            <CandidateMatchItem key={region.region_id} region={region} />
          ))}
        </ol>
      ) : (
        <p className="mt-10 border border-neutral-300 bg-white p-5 text-base font-semibold text-neutral-700">
          선택한 조건과 연결된 후보군이 아직 없습니다.
          {exploration.selected_conditions.includes("transport")
            ? ` ${exploration.metadata.transport_status}`
            : ""}
        </p>
      )}
    </aside>
  );
}

function CandidateMatchItem({ region }: { region: CandidateMatchRegion }) {
  return (
    <li className="border border-neutral-300 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xl font-black">{region.display_name}</p>
          <p className="mt-2 text-sm font-semibold text-neutral-500">
            관련 지표 {region.match_count}개 관측
          </p>
        </div>
        <span className="border border-neutral-950 px-3 py-1 text-sm font-black">
          {region.match_count}
        </span>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {region.matched_indicators.map((indicator) => (
          <span
            className="border border-neutral-300 px-3 py-1 text-sm font-bold text-neutral-700"
            key={indicator}
          >
            {indicator}
          </span>
        ))}
      </div>
      <ul className="mt-5 grid gap-2 text-sm font-semibold leading-6 text-neutral-600">
        {Object.entries(region.indicator_summary).map(([condition, summary]) => (
          <li key={condition}>{summary}</li>
        ))}
      </ul>
    </li>
  );
}
