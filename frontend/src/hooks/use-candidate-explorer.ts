"use client";

import { FormEvent, useState } from "react";

import { fetchCandidateMatches } from "@/lib/api";
import type { ExploreCondition, ExploreResponse } from "@/types/sweethome";

const DEFAULT_CONDITIONS: ExploreCondition[] = ["safety", "convenience"];

export function useCandidateExplorer() {
  const [selectedConditions, setSelectedConditions] =
    useState<ExploreCondition[]>(DEFAULT_CONDITIONS);
  const [exploration, setExploration] = useState<ExploreResponse | null>(null);
  const [isExploring, setIsExploring] = useState(false);
  const [exploreErrorMessage, setExploreErrorMessage] = useState("");

  function toggleCondition(condition: ExploreCondition) {
    setSelectedConditions((current) => {
      if (current.includes(condition)) {
        return current.filter((item) => item !== condition);
      }

      return [...current, condition];
    });
  }

  async function handleExplore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setExploreErrorMessage("");

    if (!selectedConditions.length) {
      setExploreErrorMessage("탐색할 조건을 하나 이상 선택해 주세요.");
      return;
    }

    setIsExploring(true);

    try {
      setExploration(await fetchCandidateMatches(selectedConditions));
    } catch (error) {
      setExploreErrorMessage(
        error instanceof Error ? error.message : "후보군을 불러오지 못했습니다.",
      );
    } finally {
      setIsExploring(false);
    }
  }

  return {
    exploration,
    exploreErrorMessage,
    handleExplore,
    isExploring,
    selectedConditions,
    toggleCondition,
  };
}
