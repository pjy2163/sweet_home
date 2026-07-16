import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "서울 동네 후보 찾기",
  description: "예산과 생활 조건을 바탕으로 서울 행정동 후보를 좁히고 가격, 생활 편의, 교통과 야간 생활환경을 같은 기준으로 비교합니다.",
  alternates: { canonical: "/app" },
};

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
