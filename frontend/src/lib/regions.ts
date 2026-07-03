import type { RegionGroups, RegionOption } from "@/types/sweethome";

const DEFAULT_REGION_A = "강남구 개포1동";
const DEFAULT_REGION_B = "강남구 개포4동";

export function groupRegionsByGu(regions: RegionOption[]) {
  return regions.reduce<RegionGroups>((groups, region) => {
    groups[region.gu_name] = groups[region.gu_name] ?? [];
    groups[region.gu_name].push(region);
    return groups;
  }, {});
}

export function getDefaultRegionPair(regions: RegionOption[]) {
  const regionA =
    regions.find((region) => region.display_name === DEFAULT_REGION_A) ??
    regions[0];
  const regionB =
    regions.find((region) => region.display_name === DEFAULT_REGION_B) ??
    regions[1] ??
    regions[0];

  return {
    regionA: regionA?.display_name ?? "",
    regionB: regionB?.display_name ?? "",
  };
}
