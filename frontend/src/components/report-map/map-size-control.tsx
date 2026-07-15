export type MapSize = "compact" | "standard" | "expanded";

const MAP_SIZE_OPTIONS: Array<{ id: MapSize; label: string }> = [
  { id: "compact", label: "S" },
  { id: "standard", label: "M" },
  { id: "expanded", label: "L" },
];

export const MAP_SIZE_CLASS: Record<MapSize, string> = {
  compact: "h-[420px]",
  standard: "h-[560px]",
  expanded: "h-[700px]",
};

export function MapSizeControl({
  mapSize,
  onMapSizeChange,
}: {
  mapSize: MapSize;
  onMapSizeChange: (size: MapSize) => void;
}) {
  return (
    <div className="absolute right-5 top-5 z-20 flex rounded-lg border border-white/10 bg-black/45 p-1 backdrop-blur">
      {MAP_SIZE_OPTIONS.map((option) => {
        const selected = option.id === mapSize;

        return (
          <button
            aria-label={`지도 크기 ${option.label}`}
            aria-pressed={selected}
            className={`h-8 w-8 rounded-md font-mono text-[10px] font-bold transition ${
              selected
                ? "bg-white text-black"
                : "text-[#cacaca] hover:bg-white/[0.08] hover:text-[#f5f5f7]"
            }`}
            key={option.id}
            onClick={() => onMapSizeChange(option.id)}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
