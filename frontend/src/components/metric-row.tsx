import { tableStyles } from "@/styles/components";

type MetricRowProps = {
  label: string;
  a: string;
  b: string;
};

export function MetricRow({ label, a, b }: MetricRowProps) {
  return (
    <div className={tableStyles.row}>
      <div className="font-semibold text-[#10231d]">{label}</div>
      <div className="text-[#526b62]">{a}</div>
      <div className="text-[#526b62]">{b}</div>
    </div>
  );
}
