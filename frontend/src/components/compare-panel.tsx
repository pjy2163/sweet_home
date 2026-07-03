import { FormEvent } from "react";

import { DataStatusPanel } from "@/components/data-status-panel";
import { RegionSelectField } from "@/components/region-select-field";
import {
  controlStyles,
  layoutStyles,
  textStyles,
} from "@/styles/components";
import type { Metadata, RegionGroups } from "@/types/sweethome";

type ComparePanelProps = {
  errorMessage: string;
  isBooting: boolean;
  isLoading: boolean;
  metadata: Metadata | null;
  onCompare: (event: FormEvent<HTMLFormElement>) => void;
  onRegionAChange: (value: string) => void;
  onRegionBChange: (value: string) => void;
  regionA: string;
  regionB: string;
  regionGroups: [string, RegionGroups[string]][];
};

export function ComparePanel({
  errorMessage,
  isBooting,
  isLoading,
  metadata,
  onCompare,
  onRegionAChange,
  onRegionBChange,
  regionA,
  regionB,
  regionGroups,
}: ComparePanelProps) {
  return (
    <section
      className={`${layoutStyles.section} pb-20`}
      id="compare"
    >
      <div className={layoutStyles.borderedPanel}>
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <form className={layoutStyles.panelPadding} onSubmit={onCompare}>
            <div className="mb-10">
              <p className={textStyles.eyebrow}>Compare</p>
              <h2 className={textStyles.sectionTitle}>후보 지역 2곳 선택</h2>
            </div>

            <div className="grid gap-6">
              <RegionSelectField
                disabled={isBooting}
                label="첫 번째 지역"
                onChange={onRegionAChange}
                regionGroups={regionGroups}
                value={regionA}
              />
              <RegionSelectField
                disabled={isBooting}
                label="두 번째 지역"
                onChange={onRegionBChange}
                regionGroups={regionGroups}
                value={regionB}
              />
            </div>

            {errorMessage ? (
              <p className={controlStyles.error}>{errorMessage}</p>
            ) : null}

            <button
              className={controlStyles.primaryButton}
              disabled={isBooting || isLoading}
              type="submit"
            >
              {isLoading ? "비교 중" : "지역 비교하기"}
            </button>
          </form>

          <DataStatusPanel metadata={metadata} />
        </div>
      </div>
    </section>
  );
}
