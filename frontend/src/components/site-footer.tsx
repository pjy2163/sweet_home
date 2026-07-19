import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";

const FOOTER_GROUPS = [
  {
    title: "서비스",
    links: [
      ["서비스 소개", "/#product"],
      ["이용 방법", "/#process"],
      ["서울 동네 추천 가이드", "/seoul-neighborhood-guide"],
      ["내 조건으로 후보 찾기", "/app"],
      ["지도에서 비교하기", "/app/report-map?mode=direct&conditions=price,convenience,safety,population,transport"],
    ],
  },
  {
    title: "데이터와 기준",
    links: [
      ["비교 방식", "/#comparison-method"],
      ["데이터 출처와 한계", "/data-policy"],
      ["공개 데이터 명세", "https://github.com/pjy2163/sweet_home#데이터-출처와-산출-기준"],
    ],
  },
  {
    title: "내 기록",
    links: [
      ["로그인", "/login"],
      ["내 의사결정 기록", "/mypage"],
    ],
  },
  {
    title: "이용약관 및 정책",
    links: [
      ["서비스 이용약관", "/terms"],
      ["개인정보처리방침", "/privacy"],
      ["GitHub 저장소", "https://github.com/pjy2163/sweet_home"],
    ],
  },
  {
    title: "Contact",
    note: "버그·기능 문의",
    links: [
      ["parangofsky@gmail.com", "mailto:parangofsky@gmail.com?subject=SweetHome%20%EB%B2%84%EA%B7%B8%C2%B7%EA%B8%B0%EB%8A%A5%20%EB%AC%B8%EC%9D%98"],
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer border-t border-line bg-white/86 text-ink">
      <div className="mx-auto max-w-[1500px] px-5 py-14 sm:px-8 sm:py-16 xl:px-10">
        <div className="grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[1.45fr_repeat(5,minmax(150px,1fr))]">
          <div>
            <Link className="block w-[154px]" href="/"><BrandLogo /></Link>
            <p className="mt-5 max-w-[220px] text-xs leading-6 text-muted">
              집을 추천하는 대신, 후보 지역을 같은 데이터 기준으로 비교해 주거 의사결정을 돕습니다.
            </p>
            <p className="mt-4 text-[11px] font-semibold text-muted">운영 · parang</p>
          </div>
          {FOOTER_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="text-xs font-bold text-subtle">{group.title}</p>
              {"note" in group ? <p className="mt-5 text-xs font-semibold text-muted">{group.note}</p> : null}
              <ul className={`${"note" in group ? "mt-2" : "mt-5"} space-y-3 text-sm font-semibold`}>
                {group.links.map(([label, href]) => (
                  <li key={label}>
                    {href.startsWith("http") || href.startsWith("mailto:") ? (
                      <a
                        className={`${href.startsWith("mailto:") ? "break-all text-xs" : "break-keep"} transition hover:text-sage-strong`}
                        href={href}
                        rel={href.startsWith("http") ? "noreferrer" : undefined}
                        target={href.startsWith("http") ? "_blank" : undefined}
                      >
                        {label}{href.startsWith("http") ? " ↗" : ""}
                      </a>
                    ) : (
                      <Link className="transition hover:text-sage-strong" href={href}>{label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col gap-3 border-t border-line pt-6 text-[11px] leading-5 text-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 SweetHome. All rights reserved.</p>
          <p>데이터는 저장 시점과 원천별 기준일에 따라 달라질 수 있습니다.</p>
        </div>
      </div>
    </footer>
  );
}
