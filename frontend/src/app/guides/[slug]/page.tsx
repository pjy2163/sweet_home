import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { SiteFooter } from "@/components/site-footer";
import { StructuredData } from "@/components/structured-data";
import { findSeoGuide, SEO_GUIDES } from "@/lib/seo-guides";
import { siteUrl } from "@/lib/site-url";

type GuidePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return SEO_GUIDES.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = findSeoGuide(slug);

  if (!guide) {
    return {};
  }

  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: guide.path },
    openGraph: {
      type: "article",
      url: guide.path,
      title: `${guide.title} | SweetHome`,
      description: guide.description,
      publishedTime: guide.publishedAt,
      modifiedTime: guide.modifiedAt,
      images: [
        {
          url: "/sweethome-brand-illustration.png",
          width: 1672,
          height: 941,
          alt: "서울 지도 위에서 후보 지역의 생활 조건을 비교하는 SweetHome",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${guide.title} | SweetHome`,
      description: guide.description,
      images: ["/twitter-image"],
    },
  };
}

export default async function SeoGuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = findSeoGuide(slug);

  if (!guide) {
    notFound();
  }

  const baseUrl = siteUrl();
  const guideUrl = new URL(guide.path, baseUrl).toString();
  const guideHubUrl = new URL("/seoul-neighborhood-guide", baseUrl).toString();
  const imageUrl = new URL(
    "/sweethome-brand-illustration.png",
    baseUrl,
  ).toString();
  const organizationId = "https://paranglabs.com/#organization";
  const relatedGuides = SEO_GUIDES.filter(({ slug: itemSlug }) => itemSlug !== slug);

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${guideUrl}#article`,
        mainEntityOfPage: { "@type": "WebPage", "@id": guideUrl },
        headline: guide.title,
        description: guide.description,
        inLanguage: "ko-KR",
        datePublished: guide.publishedAt,
        dateModified: guide.modifiedAt,
        image: [imageUrl],
        author: { "@id": organizationId },
        publisher: { "@id": organizationId },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${guideUrl}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "SweetHome",
            item: new URL("/", baseUrl).toString(),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "서울 동네 추천 가이드",
            item: guideHubUrl,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: guide.kicker,
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
          <Link
            aria-label="SweetHome 홈"
            className="block w-[164px]"
            href="/"
          >
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
            <Link className="hover:text-sage-strong" href="/">
              SweetHome
            </Link>
            <span aria-hidden="true" className="px-2">
              /
            </span>
            <Link
              className="hover:text-sage-strong"
              href="/seoul-neighborhood-guide"
            >
              서울 동네 추천 가이드
            </Link>
            <span aria-hidden="true" className="px-2">
              /
            </span>
            <span>{guide.kicker}</span>
          </nav>

          <header className="mt-10 max-w-4xl">
            <p className="text-xs font-semibold tracking-[.1em] text-sage">
              {guide.kicker}
            </p>
            <h1 className="mt-5 text-4xl font-medium leading-[1.12] tracking-[-.045em] sm:text-6xl">
              {guide.headline.split("\n").map((line) => (
                <span className="block" key={line}>
                  {line}
                </span>
              ))}
            </h1>
            <p className="mt-7 max-w-3xl text-base leading-8 text-muted sm:text-lg">
              {guide.introduction}
            </p>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-subtle">
              <span>작성·운영 Parang Labs</span>
              <time dateTime={guide.modifiedAt}>게시·수정 2026년 7월 23일</time>
            </div>
          </header>

          <section className="mt-16 border-t border-line pt-14">
            <p className="text-xs font-semibold tracking-[.1em] text-sage">
              비교 기준
            </p>
            <h2 className="mt-4 text-3xl font-medium tracking-[-.04em]">
              후보 지역을 좁힐 때 확인할 네 가지
            </h2>
            <div className="mt-9 grid gap-4 sm:grid-cols-2">
              {guide.criteria.map((criterion, index) => (
                <section
                  className="rounded-2xl border border-line bg-white p-6"
                  key={criterion.title}
                >
                  <p className="text-xs font-semibold text-sage">
                    0{index + 1}
                  </p>
                  <h3 className="mt-3 text-xl font-semibold">
                    {criterion.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-muted">
                    {criterion.description}
                  </p>
                </section>
              ))}
            </div>
          </section>

          <section className="mt-16 border-t border-line pt-14">
            <p className="text-xs font-semibold tracking-[.1em] text-sage">
              상황별 확인법
            </p>
            <h2 className="mt-4 text-3xl font-medium tracking-[-.04em]">
              내 조건에 맞게 비교 기준 적용하기
            </h2>
            <div className="mt-8 divide-y divide-line border-y border-line">
              {guide.situations.map((situation) => (
                <section
                  className="grid gap-4 py-8 sm:grid-cols-[.8fr_1.2fr]"
                  key={situation.title}
                >
                  <h3 className="text-xl font-semibold leading-8">
                    {situation.title}
                  </h3>
                  <p className="text-sm leading-7 text-muted">
                    {situation.body}
                  </p>
                </section>
              ))}
            </div>
          </section>

          <section className="mt-16 rounded-3xl bg-ink px-6 py-10 text-white sm:px-10 sm:py-12">
            <p className="text-xs font-semibold tracking-[.1em] text-sage-soft">
              비교 순서
            </p>
            <ol className="mt-7 grid gap-6 sm:grid-cols-3">
              {guide.steps.map((step, index) => (
                <li key={step.title}>
                  <strong className="block text-lg">
                    {index + 1}. {step.title}
                  </strong>
                  <span className="mt-2 block text-sm leading-6 text-white/70">
                    {step.body}
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-ink"
                href="/app"
              >
                내 조건으로 후보 찾기
              </Link>
              <Link
                className="rounded-lg border border-white/30 px-5 py-3 text-sm font-semibold text-white"
                href="/app/report-map?mode=direct&conditions=price,convenience,safety,population,transport"
              >
                서울 동네 지도 비교
              </Link>
            </div>
          </section>

          <section className="mt-16 border-t border-line pt-14">
            <h2 className="text-3xl font-medium tracking-[-.04em]">
              데이터를 해석할 때 알아둘 점
            </h2>
            <ul className="mt-6 space-y-4 text-sm leading-7 text-muted">
              {guide.limitations.map((limitation) => (
                <li className="flex gap-3" key={limitation}>
                  <span aria-hidden="true" className="text-sage">
                    ·
                  </span>
                  <span>{limitation}</span>
                </li>
              ))}
            </ul>
            <Link
              className="mt-7 inline-flex font-semibold text-sage-strong underline underline-offset-4"
              href="/data-policy"
            >
              데이터 출처와 해석 한계 자세히 보기 →
            </Link>
          </section>

          <section className="mt-16 border-t border-line pt-14">
            <p className="text-xs font-semibold tracking-[.1em] text-sage">
              관련 가이드
            </p>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              {relatedGuides.map((relatedGuide) => (
                <Link
                  className="rounded-2xl border border-line bg-white p-6 transition hover:border-sage-line hover:bg-mint/30"
                  href={relatedGuide.path}
                  key={relatedGuide.slug}
                >
                  <h2 className="text-lg font-semibold">{relatedGuide.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    {relatedGuide.description}
                  </p>
                  <span className="mt-5 inline-flex text-sm font-semibold text-sage-strong">
                    가이드 보기 →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </article>

      <SiteFooter />
    </main>
  );
}
