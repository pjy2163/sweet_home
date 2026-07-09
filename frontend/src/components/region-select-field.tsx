import type { RegionGroups } from "@/types/sweethome";
import { controlStyles } from "@/styles/components";

type RegionSelectFieldProps = {
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  regionGroups: [string, RegionGroups[string]][];
  value: string;
};

export function RegionSelectField({
  disabled,
  label,
  onChange,
  regionGroups,
  value,
}: RegionSelectFieldProps) {
  return (
    <label className="grid gap-3">
      <span className="text-lg font-semibold">{label}</span>
      <select
        className={controlStyles.select}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        value={value}
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
  );
}
