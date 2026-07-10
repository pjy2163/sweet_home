"use client";

import { useState } from "react";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { CandidateExplorer } from "@/components/candidate-explorer";
import { ComparePanel } from "@/components/compare-panel";
import { ComparisonResult } from "@/components/comparison-result";
import {
  EntryMode,
  EntryModeSelector,
} from "@/components/entry-mode-selector";
import { useCandidateExplorer } from "@/hooks/use-candidate-explorer";
import { useRegionComparison } from "@/hooks/use-region-comparison";
import { layoutStyles } from "@/styles/components";

export default function SweetHomeApp() {
  const [entryMode, setEntryMode] = useState<EntryMode>("unknown");
  const [railCollapsed, setRailCollapsed] = useState(false);
  const {
    comparison,
    errorMessage,
    handleCompare,
    isBooting,
    isLoading,
    metadata,
    regionA,
    regionB,
    regionGroups,
    setRegionA,
    setRegionB,
  } = useRegionComparison();
  const {
    exploration,
    exploreErrorMessage,
    handleExplore,
    isExploring,
    selectedConditions,
    toggleCondition,
  } = useCandidateExplorer();

  return (
    <main
      className={`${layoutStyles.page} workspace ${
        railCollapsed ? "workspace-rail-collapsed" : ""
      }`}
    >
      <aside className="workspace-rail">
        <button
          aria-label={railCollapsed ? "메뉴 펼치기" : "메뉴 접기"}
          aria-pressed={railCollapsed}
          className="rail-toggle"
          onClick={() => setRailCollapsed((collapsed) => !collapsed)}
          type="button"
        >
          {railCollapsed ? ">" : "<"}
        </button>
        <Link className="workspace-mark" href="/" aria-label="SweetHome 랜딩으로 이동">
          <BrandLogo markOnly />
        </Link>
        <div className="rail-title">
          <p>MY REPORT</p>
          <strong>나의 주거<br />의사결정</strong>
        </div>
        <nav aria-label="서비스 메뉴">
          <a className="active" href="#entry"><span />시작 단계<i>01</i></a>
          <a href="#explore"><span />후보 탐색<i>02</i></a>
          <a href="#heatmap-report"><span />상세 지도<i>03</i></a>
          <a href="#compare"><span />지역 비교<i>04</i></a>
          <a href="#basis"><span />결과 리포트<i>05</i></a>
        </nav>
        <Link className="rail-help" href="/" aria-label="랜딩으로 돌아가기">← 소개로 돌아가기</Link>
      </aside>
      <div className="workspace-content">
        <div className="workspace-context">
          <p>DECISION WORKSPACE</p>
          <span>서울 행정동 · 최신 가용 데이터 기준</span>
        </div>
        <EntryModeSelector mode={entryMode} onModeChange={setEntryMode} />
        {entryMode === "unknown" ? (
          <CandidateExplorer
            errorMessage={exploreErrorMessage}
            exploration={exploration}
            isExploring={isExploring}
            onExplore={handleExplore}
            onToggleCondition={toggleCondition}
            selectedConditions={selectedConditions}
          />
        ) : (
          <ComparePanel
            errorMessage={errorMessage}
            isBooting={isBooting}
            isLoading={isLoading}
            metadata={metadata}
            onCompare={handleCompare}
            onRegionAChange={setRegionA}
            onRegionBChange={setRegionB}
            regionA={regionA}
            regionB={regionB}
            regionGroups={regionGroups}
          />
        )}
        <ComparisonResult comparison={comparison} />
      </div>
    </main>
  );
}
