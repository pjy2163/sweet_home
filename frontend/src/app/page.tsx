"use client";

import { AppHeader } from "@/components/app-header";
import { CandidateExplorer } from "@/components/candidate-explorer";
import { ComparePanel } from "@/components/compare-panel";
import { ComparisonResult } from "@/components/comparison-result";
import { HeroSection } from "@/components/hero-section";
import { useCandidateExplorer } from "@/hooks/use-candidate-explorer";
import { useRegionComparison } from "@/hooks/use-region-comparison";
import { layoutStyles } from "@/styles/components";

export default function Home() {
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
    <main className={layoutStyles.page}>
      <AppHeader />
      <HeroSection />
      <CandidateExplorer
        errorMessage={exploreErrorMessage}
        exploration={exploration}
        isExploring={isExploring}
        onExplore={handleExplore}
        onToggleCondition={toggleCondition}
        selectedConditions={selectedConditions}
      />
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
      <ComparisonResult comparison={comparison} />
    </main>
  );
}
