"use client";

import { useId, useMemo, useState } from "react";

import type { RegionOption } from "@/types/sweethome";

const HANGUL_INITIALS = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];
const MAX_RESULTS = 12;

export function RegionSearchCombobox({
  excludedRegionId,
  label,
  onChange,
  regions,
  value,
}: {
  excludedRegionId?: string;
  label: string;
  onChange: (regionId: string) => void;
  regions: RegionOption[];
  value: string;
}) {
  const listboxId = useId();
  const selectedRegion = useMemo(
    () => regions.find((region) => region.region_id === value),
    [regions, value],
  );
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const matchingRegions = useMemo(() => {
    const availableRegions = regions.filter(
      (region) => region.region_id !== excludedRegionId,
    );
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return availableRegions;

    return availableRegions.filter((region) => {
      const fullName = normalizeSearchText(
        `${region.gu_name} ${region.dong_name} ${region.display_name}`,
      );
      return fullName.includes(normalizedQuery)
        || hangulInitials(fullName).includes(normalizedQuery);
    });
  }, [excludedRegionId, query, regions]);
  const visibleRegions = matchingRegions.slice(0, MAX_RESULTS);

  function selectRegion(region: RegionOption) {
    onChange(region.region_id);
    setQuery(region.display_name);
    setIsOpen(false);
    setActiveIndex(0);
  }

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget)) return;
        setIsOpen(false);
        setQuery(selectedRegion?.display_name ?? "");
      }}
    >
      <label className="sr-only" htmlFor={`${listboxId}-input`}>{label}</label>
      <div className="flex h-14 items-center rounded-lg border border-[#dfe3ea] bg-white px-4 focus-within:border-[#1888e8] focus-within:ring-2 focus-within:ring-[#1888e8]/10">
        <span aria-hidden="true" className="mr-3 text-[#9aa1af]">⌕</span>
        <input
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9aa1af]"
          id={`${listboxId}-input`}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
            setActiveIndex(0);
          }}
          onFocus={() => {
            setQuery("");
            setIsOpen(true);
            setActiveIndex(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setIsOpen(true);
              if (!visibleRegions.length) return;
              setActiveIndex((index) => Math.min(index + 1, visibleRegions.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              if (!visibleRegions.length) return;
              setActiveIndex((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter" && isOpen && visibleRegions[activeIndex]) {
              event.preventDefault();
              selectRegion(visibleRegions[activeIndex]);
            } else if (event.key === "Escape") {
              setIsOpen(false);
              setQuery(selectedRegion?.display_name ?? "");
            }
          }}
          placeholder={`${label} · 구·동 또는 초성 검색`}
          role="combobox"
          value={isOpen ? query : selectedRegion?.display_name ?? ""}
        />
        {selectedRegion ? (
          <button
            aria-label={`${label} 선택 해제`}
            className="ml-2 grid h-7 w-7 place-items-center rounded-full text-xs text-[#8a92a1] hover:bg-[#f0f2f5] hover:text-[#4f5869]"
            onClick={() => {
              onChange("");
              setQuery("");
              setIsOpen(true);
              setActiveIndex(0);
            }}
            type="button"
          >
            ×
          </button>
        ) : null}
      </div>

      {isOpen ? (
        <div className="absolute inset-x-0 top-[calc(100%+.4rem)] z-50 overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_18px_45px_rgba(23,32,59,.16)]">
          <div className="flex items-center justify-between border-b border-[#eceef2] px-4 py-3 text-[11px] text-[#7d8595]">
            <span>구·동 이름 또는 초성으로 검색</span>
            <span>{matchingRegions.length}곳</span>
          </div>
          <div className="max-h-80 overflow-y-auto p-2" id={listboxId} role="listbox">
            {visibleRegions.length ? visibleRegions.map((region, index) => (
              <button
                aria-selected={region.region_id === value}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-3 text-left transition ${index === activeIndex ? "bg-[#edf7ff]" : "hover:bg-[#f6f8fa]"}`}
                key={region.region_id}
                onClick={() => selectRegion(region)}
                onMouseEnter={() => setActiveIndex(index)}
                role="option"
                type="button"
              >
                <span>
                  <span className="block text-xs text-[#8a92a1]">{region.gu_name}</span>
                  <span className="mt-1 block text-sm font-semibold text-[#17203b]">{region.dong_name}</span>
                </span>
                {region.region_id === value ? <span className="text-sm font-semibold text-[#1888e8]">선택됨</span> : null}
              </button>
            )) : (
              <div className="px-4 py-10 text-center text-sm text-[#818999]">
                검색 결과가 없습니다.
              </div>
            )}
          </div>
          {matchingRegions.length > MAX_RESULTS ? (
            <p className="border-t border-[#eceef2] px-4 py-3 text-[11px] text-[#8a92a1]">검색어를 더 입력하면 결과를 좁힐 수 있습니다.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function normalizeSearchText(value: string) {
  return value.toLocaleLowerCase("ko-KR").replace(/\s+/g, "");
}

function hangulInitials(value: string) {
  return Array.from(value, (character) => {
    const offset = character.charCodeAt(0) - 0xac00;
    if (offset < 0 || offset > 11171) return character;
    return HANGUL_INITIALS[Math.floor(offset / 588)];
  }).join("");
}
