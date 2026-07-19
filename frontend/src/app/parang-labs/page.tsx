import type { Metadata } from "next";

import { StructuredData } from "@/components/structured-data";

export const metadata: Metadata = {
  title: "Parang Labs | 데이터로 더 나은 선택",
  description:
    "Parang Labs는 일상의 복잡한 선택을 더 명확하게 만드는 데이터 기반 제품을 만듭니다.",
  alternates: { canonical: "https://paranglabs.com" },
  openGraph: {
    title: "Parang Labs | 데이터로 더 나은 선택",
    description: "데이터를 이해하기 쉬운 근거로 바꾸는 작은 제품 스튜디오입니다.",
    url: "https://paranglabs.com",
    type: "website",
  },
};

export default function ParangLabsPage() {
  const organizationStructuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://paranglabs.com/#organization",
    name: "Parang Labs",
    url: "https://paranglabs.com/",
    description: "데이터를 이해하기 쉬운 비교 근거로 바꾸는 제품 스튜디오",
  };

  return (
    <main className="flex min-h-screen flex-col bg-[#f4f1eb] text-[#24272d]">
      <StructuredData data={organizationStructuredData} />
      <header className="border-b border-[#d9d6cf] bg-white/75">
        <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-6 sm:px-10">
          <a className="text-lg font-semibold tracking-[-0.03em]" href="https://paranglabs.com">
            Parang Labs
          </a>
          <a
            className="text-sm font-semibold text-[#52675f]"
            href="https://sweethome.paranglabs.com"
          >
            SweetHome 보기 →
          </a>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl flex-1 gap-14 px-6 py-20 sm:px-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:py-28">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#668277]">
            Data product studio
          </p>
          <h1 className="mt-6 max-w-3xl text-5xl font-medium leading-[1.08] tracking-[-0.055em] sm:text-6xl">
            복잡한 선택을
            <br />
            더 분명하게 만듭니다.
          </h1>
          <p className="mt-8 max-w-xl text-base leading-8 text-[#626871]">
            Parang Labs는 흩어진 데이터를 이해하기 쉬운 비교 근거로 바꾸고,
            사용자가 스스로 더 나은 결정을 내릴 수 있도록 돕는 제품을 만듭니다.
          </p>
        </div>

        <article className="rounded-3xl border border-[#d7ddd8] bg-white p-8 shadow-[0_24px_70px_rgba(54,62,58,.09)] sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#668277]">
            Current product
          </p>
          <h2 className="mt-5 text-3xl font-semibold tracking-[-0.04em]">SweetHome</h2>
          <p className="mt-4 text-sm leading-7 text-[#626871]">
            서울의 주거 후보 지역을 예산, 생활 편의, 교통과 생활환경 데이터로
            비교하는 의사결정 지원 서비스입니다. 특정 지역을 정답처럼 추천하지 않고
            후보와 비교 근거를 제공합니다.
          </p>
          <a
            className="mt-8 inline-flex rounded-xl bg-[#24272d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#39403f]"
            href="https://sweethome.paranglabs.com"
          >
            SweetHome 방문하기
          </a>
        </article>
      </section>

      <footer className="border-t border-[#d9d6cf] px-6 py-8 text-center text-xs text-[#7a7f86] sm:px-10">
        © 2026 Parang Labs. Data for clearer decisions.
      </footer>
    </main>
  );
}
