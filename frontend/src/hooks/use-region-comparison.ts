"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { fetchComparison, fetchMetadata, fetchRegions } from "@/lib/api";
import { getDefaultRegionPair, groupRegionsByGu } from "@/lib/regions";
import type { CompareResponse, Metadata, RegionOption } from "@/types/sweethome";

export function useRegionComparison() {
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
        const [nextRegions, nextMetadata] = await Promise.all([
          fetchRegions(),
          fetchMetadata(),
        ]);
        const defaultPair = getDefaultRegionPair(nextRegions);

        setRegions(nextRegions);
        setMetadata(nextMetadata);
        setRegionA(defaultPair.regionA);
        setRegionB(defaultPair.regionB);
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

  const regionGroups = useMemo(() => {
    return Object.entries(groupRegionsByGu(regions));
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
      setComparison(await fetchComparison(regionA, regionB));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "지역 비교에 실패했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return {
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
  };
}
