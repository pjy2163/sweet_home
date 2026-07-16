import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "데이터 출처와 비교 기준",
  description: "SweetHome이 서울 동네 비교에 사용하는 주거 비용, 생활 편의, 교통, 체류인구 데이터의 출처와 한계를 확인합니다.",
  alternates: { canonical: "/data-policy" },
};

export default function DataPolicyLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
