import { tableStyles } from "@/styles/components";

type MetricRowProps = {
  label: string;
  a: string;
  b: string;
};

export function MetricRow({ label, a, b }: MetricRowProps) {
  return (
    <div className={tableStyles.row}>
      <div className="font-semibold text-neutral-950">{label}</div>
      <div className="text-neutral-700">{a}</div>
      <div className="text-neutral-700">{b}</div>
    </div>
  );
}
