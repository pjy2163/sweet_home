"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type RegionOption = {
  region_id: string;
  gu_name: string;
  dong_name: string;
  display_name: string;
};

type Metadata = {
  region_count: number;
  price_latest_month: string | null;
  population_latest_month: string | null;
  safety_latest_date: string | null;
  commercial_latest_quarter: string | null;
  source: string;
  aggregation: string;
  limitation: string;
};

type RegionMetrics = {
  display_name: string;
  deposit: number | null;
  seoul_deposit: number | null;
  deposit_ratio: number | null;
  jeonse: number | null;
  seoul_jeonse: number | null;
  jeonse_ratio: number | null;
  volume: number | null;
  low_volume: boolean;
  living_population: number | null;
  safe_facility_count: number | null;
  nightlife_count: number | null;
  industry_count: number | null;
  store_count: number | null;
  has_price_data: boolean;
  has_population_data: boolean;
  has_safety_data: boolean;
  has_commercial_data: boolean;
};

type CompareResponse = {
  region_a: RegionMetrics;
  region_b: RegionMetrics;
  summary: string[];
  data_basis: string[];
};

const numberFormat = new Intl.NumberFormat("ko-KR");

function formatNumber(value: number | null, suffix = "") {
  if (value === null || Number.isNaN(value)) {
    return "데이터 없음";
  }

  return `${numberFormat.format(Math.round(value))}${suffix}`;
}

function formatRatio(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "데이터 없음";
  }

  return `${value.toFixed(1)}%`;
}

function MetricRow({
  label,
  a,
  b,
}: {
  label: string;
  a: string;
  b: string;
}) {
  return (
    <div className="grid min-w-[42rem] grid-cols-[1fr_1.2fr_1.2fr] border-t border-neutral-200 py-4 text-sm sm:text-base">
      <div className="font-semibold text-neutral-950">{label}</div>
      <div className="text-neutral-700">{a}</div>
      <div className="text-neutral-700">{b}</div>
    </div>
  );
}

export default function Home() {
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [regionA, setRegionA] = useState("");
  const [regionB, setRegionB] = useState("");
  const [comparison, setComparison] = useState<CompareResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadInitialData() {
      setIsBooting(true);
      setErrorMessage("");

      try {
        const [regionsResponse, metadataResponse] = await Promise.all([
          fetch("/api/backend/regions"),
          fetch("/api/backend/metadata"),
        ]);

        if (!regionsResponse.ok || !metadataResponse.ok) {
          throw new Error("초기 데이터를 불러오지 못했습니다.");
        }

        const nextRegions = (await regionsResponse.json()) as RegionOption[];
        const nextMetadata = (await metadataResponse.json()) as Metadata;

        setRegions(nextRegions);
        setMetadata(nextMetadata);

        const defaultA =
          nextRegions.find((region) => region.display_name === "강남구 개포1동") ??
          nextRegions[0];
        const defaultB =
          nextRegions.find((region) => region.display_name === "강남구 개포4동") ??
          nextRegions[1] ??
          nextRegions[0];

        setRegionA(defaultA?.display_name ?? "");
        setRegionB(defaultB?.display_name ?? "");
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "초기 데이터를 불러오지 못했습니다.",
        );
      } finally {
        setIsBooting(false);
      }
    }

    loadInitialData();
  }, []);

  const groupedRegions = useMemo(() => {
    return regions.reduce<Record<string, RegionOption[]>>((groups, region) => {
      groups[region.gu_name] = groups[region.gu_name] ?? [];
      groups[region.gu_name].push(region);
      return groups;
    }, {});
  }, [regions]);

  async function handleCompare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!regionA || !regionB) {
      setErrorMessage("비교할 두 지역을 선택해 주세요.");
      return;
    }

    if (regionA === regionB) {
      setErrorMessage("서로 다른 두 지역을 선택해 주세요.");
      return;
    }

    setIsLoading(true);

    try {
      const params = new URLSearchParams({ a: regionA, b: regionB });
      const response = await fetch(`/api/backend/compare?${params.toString()}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "지역 비교에 실패했습니다.");
      }

      setComparison(payload as CompareResponse);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "지역 비교에 실패했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  const regionGroups = Object.entries(groupedRegions);

  return (
    <main className="min-h-screen bg-[#fbfbf8] text-neutral-950">
      <header className="border-b border-neutral-200 bg-[#fbfbf8]">
        <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-6 lg:px-10">
          <div className="leading-none">
            <div className="text-2xl font-black">SweetHome</div>
            <div className="mt-2 text-xs font-bold uppercase text-neutral-500">
              Seoul Region Compare
            </div>
          </div>
          <nav className="hidden items-center gap-12 text-lg font-bold md:flex">
            <a href="#compare">지역비교</a>
            <a href="#basis">데이터기준</a>
            <a href="#result">비교결과</a>
          </nav>
          <button
            aria-label="메뉴 열기"
            className="flex h-12 w-12 items-center justify-center border border-neutral-950"
            type="button"
          >
            <span className="h-0.5 w-7 bg-neutral-950 shadow-[0_8px_0_#0a0a0a,0_-8px_0_#0a0a0a]" />
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 pb-16 pt-14 text-center lg:px-10 lg:pt-20">
        <div className="mb-12 flex justify-center gap-3 text-sm font-semibold text-neutral-500 md:justify-end">
          <span>홈</span>
          <span>/</span>
          <span>지역비교</span>
          <span>/</span>
          <span className="text-neutral-900">후보지 선택</span>
        </div>
        <h1 className="mx-auto max-w-5xl text-5xl font-black leading-tight sm:text-6xl lg:text-7xl">
          동네를 고르는 기준,
          <br />
          데이터로 비교하세요
        </h1>
        <p className="mx-auto mt-8 max-w-3xl text-lg font-semibold leading-8 text-neutral-700 sm:text-xl">
          서울 행정동 후보지를 비용, 생활인구, 안전 proxy, 생활편의 데이터로
          나란히 확인합니다.
        </p>
      </section>

      <section
        className="mx-auto max-w-7xl px-6 pb-20 lg:px-10"
        id="compare"
      >
        <div className="border border-neutral-300 bg-white">
          <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
            <form className="p-8 sm:p-12" onSubmit={handleCompare}>
              <div className="mb-10">
                <p className="text-sm font-black uppercase text-neutral-500">
                  Compare
                </p>
                <h2 className="mt-4 text-4xl font-black sm:text-5xl">
                  후보 지역 2곳 선택
                </h2>
              </div>

              <div className="grid gap-6">
                <label className="grid gap-3">
                  <span className="text-lg font-black">첫 번째 지역</span>
                  <select
                    className="h-16 border border-neutral-300 bg-white px-5 text-lg font-semibold outline-none transition focus:border-neutral-950"
                    disabled={isBooting}
                    onChange={(event) => setRegionA(event.target.value)}
                    value={regionA}
                  >
                    {regionGroups.map(([guName, options]) => (
                      <optgroup key={guName} label={guName}>
                        {options.map((region) => (
                          <option key={region.region_id} value={region.display_name}>
                            {region.display_name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>

                <label className="grid gap-3">
                  <span className="text-lg font-black">두 번째 지역</span>
                  <select
                    className="h-16 border border-neutral-300 bg-white px-5 text-lg font-semibold outline-none transition focus:border-neutral-950"
                    disabled={isBooting}
                    onChange={(event) => setRegionB(event.target.value)}
                    value={regionB}
                  >
                    {regionGroups.map(([guName, options]) => (
                      <optgroup key={guName} label={guName}>
                        {options.map((region) => (
                          <option key={region.region_id} value={region.display_name}>
                            {region.display_name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
              </div>

              {errorMessage ? (
                <p className="mt-6 border border-neutral-300 bg-neutral-50 px-5 py-4 text-base font-semibold text-neutral-700">
                  {errorMessage}
                </p>
              ) : null}

              <button
                className="mt-10 h-16 w-full bg-neutral-950 px-8 text-lg font-black text-white transition hover:bg-neutral-700 disabled:bg-neutral-400"
                disabled={isBooting || isLoading}
                type="submit"
              >
                {isLoading ? "비교 중" : "지역 비교하기"}
              </button>
            </form>

            <aside className="border-t border-neutral-300 bg-neutral-50 p-8 sm:p-12 lg:border-l lg:border-t-0">
              <p className="text-sm font-black uppercase text-neutral-500">
                Data Status
              </p>
              <h2 className="mt-4 text-4xl font-black">
                {metadata ? `${metadata.region_count}개 행정동` : "데이터 연결 대기"}
              </h2>
              <dl className="mt-10 grid gap-5 text-base">
                <div className="grid grid-cols-[8rem_1fr] gap-4">
                  <dt className="font-black">전월세</dt>
                  <dd className="text-neutral-600">
                    {metadata?.price_latest_month ?? "-"}
                  </dd>
                </div>
                <div className="grid grid-cols-[8rem_1fr] gap-4">
                  <dt className="font-black">생활인구</dt>
                  <dd className="text-neutral-600">
                    {metadata?.population_latest_month ?? "-"}
                  </dd>
                </div>
                <div className="grid grid-cols-[8rem_1fr] gap-4">
                  <dt className="font-black">안전 proxy</dt>
                  <dd className="text-neutral-600">
                    {metadata?.safety_latest_date ?? "-"}
                  </dd>
                </div>
                <div className="grid grid-cols-[8rem_1fr] gap-4">
                  <dt className="font-black">상권</dt>
                  <dd className="text-neutral-600">
                    {metadata?.commercial_latest_quarter ?? "-"}
                  </dd>
                </div>
              </dl>
              <p className="mt-10 border-t border-neutral-300 pt-8 text-base leading-7 text-neutral-600">
                결과는 후보 지역의 객관 지표 비교입니다. 특정 주거지 선택,
                투자 판단, 안전 보장을 의미하지 않습니다.
              </p>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-10" id="result">
        {comparison ? (
          <div className="border border-neutral-300 bg-white">
            <div className="grid gap-8 border-b border-neutral-300 p-8 sm:p-12 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-sm font-black uppercase text-neutral-500">
                  Result
                </p>
                <h2 className="mt-4 text-4xl font-black sm:text-5xl">
                  {comparison.region_a.display_name}
                  <br />
                  vs {comparison.region_b.display_name}
                </h2>
              </div>
              <ul className="grid gap-4 text-lg font-semibold leading-8 text-neutral-700">
                {comparison.summary.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>

            <div className="overflow-x-auto p-8 sm:p-12">
              <div className="grid min-w-[42rem] grid-cols-[1fr_1.2fr_1.2fr] pb-4 text-sm font-black uppercase text-neutral-500">
                <div>Metric</div>
                <div>{comparison.region_a.display_name}</div>
                <div>{comparison.region_b.display_name}</div>
              </div>
              <MetricRow
                a={formatNumber(comparison.region_a.deposit, "만원")}
                b={formatNumber(comparison.region_b.deposit, "만원")}
                label="월세 보증금"
              />
              <MetricRow
                a={formatRatio(comparison.region_a.jeonse_ratio)}
                b={formatRatio(comparison.region_b.jeonse_ratio)}
                label="전세가 서울 평균 대비"
              />
              <MetricRow
                a={formatNumber(comparison.region_a.volume, "건")}
                b={formatNumber(comparison.region_b.volume, "건")}
                label="거래량"
              />
              <MetricRow
                a={formatNumber(comparison.region_a.living_population, "명")}
                b={formatNumber(comparison.region_b.living_population, "명")}
                label="생활인구"
              />
              <MetricRow
                a={formatNumber(comparison.region_a.safe_facility_count, "개")}
                b={formatNumber(comparison.region_b.safe_facility_count, "개")}
                label="안전 proxy 시설"
              />
              <MetricRow
                a={formatNumber(comparison.region_a.store_count, "개")}
                b={formatNumber(comparison.region_b.store_count, "개")}
                label="생활편의 점포"
              />
            </div>

            <div
              className="border-t border-neutral-300 bg-neutral-50 p-8 sm:p-12"
              id="basis"
            >
              <h3 className="text-2xl font-black">데이터 기준</h3>
              <ul className="mt-6 grid gap-3 text-base leading-7 text-neutral-600">
                {comparison.data_basis.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="border border-neutral-300 bg-white p-8 text-center sm:p-12">
            <p className="text-2xl font-black">아직 비교 결과가 없습니다.</p>
            <p className="mt-4 text-base font-semibold text-neutral-600">
              후보 지역 두 곳을 선택하면 지표별 비교 결과가 이곳에 표시됩니다.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
