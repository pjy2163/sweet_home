import {
  formatDataBasis,
  formatDataDate,
  type DataSourceLink,
} from "@/lib/data-sources";

type DataBasisProps = {
  className?: string;
  primaryDate: string | null | undefined;
  secondaryDate?: string | null;
  showLabel?: boolean;
};

export function DataBasis({
  className,
  primaryDate,
  secondaryDate,
  showLabel = true,
}: DataBasisProps) {
  const label = showLabel
    ? formatDataBasis(primaryDate, secondaryDate ?? primaryDate)
    : formatDataDate(primaryDate);

  return <span className={className}>{label}</span>;
}

export function OfficialSourceLinks({ sources }: { sources: DataSourceLink[] }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[#e8ebef] pt-4 text-xs">
      <span className="font-semibold text-[#596174]">공식 출처</span>
      {sources.map((source) => (
        <a
          className="rounded-full border border-[#d7e6df] bg-white px-3 py-1.5 font-medium text-[#47655a] transition hover:border-[#9ebcaf] hover:text-[#243c34]"
          href={source.url}
          key={source.url}
          rel="noreferrer"
          target="_blank"
        >
          {source.label} ↗
        </a>
      ))}
    </div>
  );
}
