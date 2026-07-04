"use client";

import { useState } from "react";

import { AppHeader } from "@/components/app-header";
import { CandidateExplorer } from "@/components/candidate-explorer";
import { ComparePanel } from "@/components/compare-panel";
import { ComparisonResult } from "@/components/comparison-result";
import {
  EntryMode,
  EntryModeModal,
  EntryModeSelector,
} from "@/components/entry-mode-selector";
import { HeroSection } from "@/components/hero-section";
import { useCandidateExplorer } from "@/hooks/use-candidate-explorer";
import { useRegionComparison } from "@/hooks/use-region-comparison";
import { layoutStyles } from "@/styles/components";

export default function Home() {
  const [entryMode, setEntryMode] = useState<EntryMode>("unknown");
  const [showEntryModal, setShowEntryModal] = useState(true);
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

  function handleEntryModeChange(mode: EntryMode) {
    setEntryMode(mode);
    setShowEntryModal(false);
  }

  return (
    <main className={layoutStyles.page}>
      {showEntryModal ? (
        <EntryModeModal onModeChange={handleEntryModeChange} />
      ) : null}
      <AppHeader />
      <HeroSection />
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
    </main>
  );
}
