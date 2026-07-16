import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "서울 동네 지도 비교",
  description: "서울 지도에서 궁금한 동네를 직접 고르고 주거 비용, 생활 편의, 교통, 체류인구와 야간 생활환경 데이터를 비교합니다.",
  alternates: { canonical: "/app/report-map" },
};

export default function ReportMapLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
