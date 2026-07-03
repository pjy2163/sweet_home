"use client";

import { AppHeader } from "@/components/app-header";
import { ComparePanel } from "@/components/compare-panel";
import { ComparisonResult } from "@/components/comparison-result";
import { HeroSection } from "@/components/hero-section";
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

  return (
    <main className={layoutStyles.page}>
      <AppHeader />
      <HeroSection />
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
