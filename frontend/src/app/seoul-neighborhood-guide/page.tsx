import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { SiteFooter } from "@/components/site-footer";
import { StructuredData } from "@/components/structured-data";
import { siteUrl } from "@/lib/site-url";

const GUIDE_PATH = "/seoul-neighborhood-guide";
const GUIDE_TITLE = "서울 동네 추천: 예산·교통·생활 조건별 지역 비교";
const GUIDE_DESCRIPTION =
  "서울에서 살 동네를 찾을 때 예산, 월세, 생활 편의, 교통과 야간 생활환경을 어떤 기준으로 비교해야 하는지 알아보고 내 조건에 맞는 후보를 좁혀보세요.";
const PUBLISHED_AT = "2026-07-19T00:00:00+09:00";

export const metadata: Metadata = {
  title: GUIDE_TITLE,
  description: GUIDE_DESCRIPTION,
  alternates: { canonical: GUIDE_PATH },
  openGraph: {
    type: "article",
    url: GUIDE_PATH,
    title: `${GUIDE_TITLE} | SweetHome`,
    description: GUIDE_DESCRIPTION,
    publishedTime: PUBLISHED_AT,
    modifiedTime: PUBLISHED_AT,
    images: [
      {
        url: "/sweethome-brand-illustration.png",
        width: 1672,
        height: 941,
        alt: "서울 지도 위에서 후보 지역을 비교하는 SweetHome",
      },
    ],
  },
};

const CRITERIA = [
  {
    title: "예산과 주거 비용",
    description:
      "보증금과 월 부담액을 따로 보고, 같은 가격 기준에서 실제 거래가 관측된 행정동을 비교합니다. 거래가 적거나 결측인 지역은 해석에 주의해야 합니다.",
  },
  {
    title: "생활 편의",
    description:
      "마트, 의료, 생활 서비스처럼 일상에서 자주 이용하는 시설을 살펴봅니다. 시설 수가 많다는 사실이 개인에게 편리한 위치라는 뜻은 아니므로 현장 동선도 확인해야 합니다.",
  },
  {
    title: "교통 접근성",
    description:
      "역과 정류소의 위치를 후보 비교 근거로 사용합니다. 실제 출근 시간, 배차 간격, 혼잡도와 환승 편의는 별도로 확인해야 합니다.",
  },
  {
    title: "시간대별 생활환경",
    description:
      "생활인구와 야간 생활환경 관련 시설을 함께 살펴봅니다. 이는 체류 특성과 환경을 이해하기 위한 참고 자료이며 범죄율이나 안전 보장을 의미하지 않습니다.",
  },
] as const;

const SEARCH_INTENTS = [
  {
    title: "서울 자취 동네 추천이 필요할 때",
    body: "처음부터 유명한 지역을 정하기보다 계약 유형, 보증금, 월 부담액과 필요한 면적을 먼저 정리하세요. 같은 예산 안에서 남는 후보를 비교해야 가격과 생활 조건의 교환 관계가 보입니다.",
  },
  {
    title: "서울 월세 지역을 비교할 때",
    body: "구 평균만 보면 같은 구 안의 행정동 차이를 놓칠 수 있습니다. SweetHome은 서울 행정동을 공통 단위로 사용하고, 가격 데이터의 기준일과 거래량 주의사항을 함께 확인하도록 돕습니다.",
  },
  {
    title: "교통이 편한 서울 동네를 찾을 때",
    body: "역이나 정류소가 많다는 이유만으로 통근이 편하다고 단정하지 않습니다. 후보를 먼저 좁힌 뒤 목적지까지의 실제 이동 시간과 환승, 야간 귀가 동선을 지도에서 따로 확인하세요.",
  },
] as const;

export default function SeoulNeighborhoodGuidePage() {
  const baseUrl = siteUrl();
  const guideUrl = new URL(GUIDE_PATH, baseUrl).toString();
  const homeUrl = new URL("/", baseUrl).toString();
  const imageUrl = new URL("/sweethome-brand-illustration.png", baseUrl).toString();
  const organizationId = "https://paranglabs.com/#organization";

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: "Parang Labs",
        url: "https://paranglabs.com/",
      },
      {
        "@type": "Article",
        "@id": `${guideUrl}#article`,
        mainEntityOfPage: { "@type": "WebPage", "@id": guideUrl },
        headline: GUIDE_TITLE,
        description: GUIDE_DESCRIPTION,
        inLanguage: "ko-KR",
        datePublished: PUBLISHED_AT,
        dateModified: PUBLISHED_AT,
        image: [imageUrl],
        author: { "@id": organizationId },
        publisher: { "@id": organizationId },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${guideUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "SweetHome", item: homeUrl },
          {
            "@type": "ListItem",
            position: 2,
            name: "서울 동네 추천 가이드",
            item: guideUrl,
          },
        ],
      },
    ],
  };

  return (
    <main className="min-h-screen bg-[#f7f5f0] text-ink">
      <StructuredData data={structuredData} />
      <header className="border-b border-line bg-white/90">
        <div className="mx-auto flex h-20 max-w-[1240px] items-center justify-between px-5 sm:px-8">
          <Link className="block w-[164px]" href="/" aria-label="SweetHome 홈">
            <BrandLogo />
          </Link>
          <Link
            className="rounded-lg bg-ink px-4 py-3 text-sm font-semibold text-white"
            href="/app"
          >
            내 조건으로 후보 찾기
          </Link>
        </div>
      </header>

      <article>
        <div className="mx-auto max-w-[1060px] px-5 py-12 sm:px-8 sm:py-16">
          <nav aria-label="현재 위치" className="text-xs text-subtle">
            <Link className="hover:text-sage-strong" href="/">SweetHome</Link>
            <span aria-hidden="true" className="px-2">/</span>
            <span>서울 동네 추천 가이드</span>
          </nav>

          <header className="mt-10 max-w-4xl">
            <p className="text-xs font-semibold tracking-[.1em] text-sage">서울 주거 가이드</p>
            <h1 className="mt-5 text-4xl font-medium leading-[1.12] tracking-[-.045em] sm:text-6xl">
              서울 동네 추천,
              <br />내 조건에 맞는 지역부터 비교해 보세요
            </h1>
            <p className="mt-7 max-w-3xl text-base leading-8 text-muted sm:text-lg">
              살기 좋은 동네는 누구에게나 같지 않습니다. 예산과 계약 조건을 먼저 정리하고,
              생활 편의, 교통과 시간대별 생활환경을 같은 기준으로 비교하면 직접 확인할
              후보를 더 분명하게 좁힐 수 있습니다.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-subtle">
              <span>작성·운영 Parang Labs</span>
              <time dateTime={PUBLISHED_AT}>게시·수정 2026년 7월 19일</time>
            </div>
          </header>

          <Image
            alt="서울 지도 위에서 후보 지역의 생활 조건을 비교하는 SweetHome"
            className="mt-12 h-auto w-full rounded-3xl border border-sage-line bg-mint"
            height={941}
            priority
            src="/sweethome-brand-illustration.png"
            width={1672}
          />

          <section className="mt-16 border-t border-line pt-14">
            <p className="text-xs font-semibold tracking-[.1em] text-sage">비교 원칙</p>
            <h2 className="mt-4 text-3xl font-medium tracking-[-.04em]">추천보다 먼저 볼 네 가지 기준</h2>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-muted">
              SweetHome에서 추천은 특정 지역의 순위를 뜻하지 않습니다. 사용자가 입력한
              조건에 맞는 후보를 압축하고, 후보가 남은 이유와 확인할 차이를 보여주는
              과정입니다.
            </p>
            <div className="mt-9 grid gap-4 sm:grid-cols-2">
              {CRITERIA.map((criterion, index) => (
                <section className="rounded-2xl border border-line bg-white p-6" key={criterion.title}>
                  <p className="text-xs font-semibold text-sage">0{index + 1}</p>
                  <h3 className="mt-3 text-xl font-semibold">{criterion.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-muted">{criterion.description}</p>
                </section>
              ))}
            </div>
          </section>

          <section className="mt-16 border-t border-line pt-14">
            <p className="text-xs font-semibold tracking-[.1em] text-sage">검색 상황별 확인법</p>
            <h2 className="mt-4 text-3xl font-medium tracking-[-.04em]">어떤 서울 동네를 찾고 있나요?</h2>
            <div className="mt-8 divide-y divide-line border-y border-line">
              {SEARCH_INTENTS.map((intent) => (
                <section className="grid gap-4 py-8 sm:grid-cols-[.8fr_1.2fr]" key={intent.title}>
                  <h3 className="text-xl font-semibold leading-8">{intent.title}</h3>
                  <p className="text-sm leading-7 text-muted">{intent.body}</p>
                </section>
              ))}
            </div>
          </section>

          <section className="mt-16 rounded-3xl bg-ink px-6 py-10 text-white sm:px-10 sm:py-12">
            <p className="text-xs font-semibold tracking-[.1em] text-sage-soft">3단계로 후보 압축</p>
            <ol className="mt-7 grid gap-6 sm:grid-cols-3">
              <li><strong className="block text-lg">1. 조건 정리</strong><span className="mt-2 block text-sm leading-6 text-white/70">계약 유형, 예산, 주택 유형과 생활 기준을 입력합니다.</span></li>
              <li><strong className="block text-lg">2. 후보 확인</strong><span className="mt-2 block text-sm leading-6 text-white/70">후보가 포함된 이유와 데이터 주의사항을 확인합니다.</span></li>
              <li><strong className="block text-lg">3. 같은 기준으로 비교</strong><span className="mt-2 block text-sm leading-6 text-white/70">최종 후보의 비용과 생활 조건 차이를 나란히 봅니다.</span></li>
            </ol>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-ink" href="/app">내 조건으로 후보 찾기</Link>
              <Link className="rounded-lg border border-white/30 px-5 py-3 text-sm font-semibold text-white" href="/app/report-map?mode=direct&conditions=price,convenience,safety,population,transport">서울 동네 지도 비교</Link>
            </div>
          </section>

          <section className="mt-16 border-t border-line pt-14">
            <h2 className="text-3xl font-medium tracking-[-.04em]">데이터를 해석할 때 알아둘 점</h2>
            <div className="mt-6 space-y-4 text-sm leading-7 text-muted">
              <p>SweetHome은 서울 행정동을 공통 비교 단위로 사용합니다. 법정동, 주소나 좌표로 제공되는 원천은 명시된 연결 과정을 거쳐 행정동 기준으로 변환합니다.</p>
              <p>주거 비용, 생활인구, 생활 편의, 교통과 야간 생활환경 데이터는 갱신 주기가 서로 다릅니다. 화면에 표시되는 원천명과 기준일을 함께 확인하세요.</p>
              <p>비교 결과는 지역의 종합 순위, 안전 보장, 투자 가치나 미래 가격 예측이 아닙니다. 계약 전에는 최신 실거래, 현장 환경과 공식 정보를 별도로 확인해야 합니다.</p>
            </div>
            <Link className="mt-7 inline-flex font-semibold text-sage-strong underline underline-offset-4" href="/data-policy">데이터 출처와 해석 한계 자세히 보기 →</Link>
          </section>
        </div>
      </article>

      <SiteFooter />
    </main>
  );
}
