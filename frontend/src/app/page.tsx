import Link from "next/link";
import Image from "next/image";

import { BrandLogo } from "@/components/brand-logo";
import { LandingScrollEffects } from "@/components/landing-scroll-effects";

const APP_URL = "/app";

const FLOW = [
  {
    number: "01",
    label: "조건 정리",
    title: "막연한 기준을\n비교 가능한 조건으로",
    description:
      "계약 유형과 예산, 생활에서 중요한 기준을 먼저 정리합니다. 입력한 조건은 언제든 다시 바꿀 수 있습니다.",
  },
  {
    number: "02",
    label: "후보 압축",
    title: "살펴볼 지역만\n후보 보드에 남기고",
    description:
      "후보가 포함된 근거와 데이터 주의사항을 확인하면서 저장하거나 제외합니다. 지역의 절대 순위는 매기지 않습니다.",
  },
  {
    number: "03",
    label: "근거 비교",
    title: "최종 후보의 차이를\n같은 기준으로 비교합니다",
    description:
      "비용, 생활 편의, 생활인구, 안전 관련 대체 지표를 나란히 보고 무엇을 얻고 포기하는지 판단합니다.",
  },
];

function ArrowLink({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <Link className={className} href={APP_URL}>
      {children}
      <span aria-hidden="true">→</span>
    </Link>
  );
}

function WorkspacePreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_24px_70px_rgba(23,32,59,.12)]" aria-label="SweetHome 후보 보드 미리보기">
      <div className="flex h-12 items-center justify-between border-b border-[#e5e8ee] px-4 text-[10px] font-semibold uppercase tracking-[.14em] text-[#9097a6]">
        <span>Decision workspace</span>
        <span>Seoul · 2026</span>
      </div>
      <div className="grid min-h-[430px] sm:grid-cols-[150px_1fr]">
        <aside className="hidden border-r border-[#e5e8ee] bg-[#fafbfc] p-4 sm:block">
          <p className="text-[9px] font-semibold uppercase tracking-[.14em] text-[#a0a6b3]">My decision</p>
          <p className="mt-2 text-sm font-semibold text-[#17203b]">주거 의사결정</p>
          <div className="mt-8 space-y-1 text-[11px]">
            <div className="rounded-md px-3 py-2 text-[#747c8d]">01 내 조건</div>
            <div className="rounded-md bg-[#eaf4ff] px-3 py-2 font-semibold text-[#1888e8]">02 후보 보드</div>
            <div className="rounded-md px-3 py-2 text-[#747c8d]">03 지역 비교</div>
          </div>
        </aside>
        <div className="bg-[#f7f8fa] p-5 sm:p-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[.14em] text-[#1888e8]">Candidate board</p>
              <h3 className="mt-2 text-xl font-semibold tracking-[-.03em] text-[#17203b]">살펴볼 후보를 압축해 보세요</h3>
            </div>
            <span className="rounded-md border border-[#dfe3ea] bg-white px-3 py-2 text-[10px] text-[#697184]">조건 수정</span>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[["탐색 후보", "8곳"], ["저장한 후보", "2/2"], ["판단 기준", "3개"]].map(([label, value], index) => (
              <div className={`rounded-lg border p-3 ${index === 1 ? "border-[#b9dcfb] bg-[#edf7ff]" : "border-[#e1e4ea] bg-white"}`} key={label}>
                <p className="text-[9px] text-[#8a91a0]">{label}</p>
                <p className={`mt-1 text-lg font-semibold ${index === 1 ? "text-[#1888e8]" : "text-[#17203b]"}`}>{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <PreviewCandidate district="마포구" dong="망원2동" reasons={["생활 편의 지표 확인", "가격 수준 비교 가능"]} />
            <PreviewCandidate district="성동구" dong="성수1가1동" reasons={["최근 거래 데이터 확인", "생활인구 지표 확인"]} />
          </div>
          <div className="mt-3 flex items-center justify-between rounded-lg border border-[#dfe3ea] bg-white px-4 py-3">
            <p className="text-[11px] font-semibold text-[#17203b]">최종 후보 2곳 선택</p>
            <span className="rounded-md bg-[#17203b] px-3 py-2 text-[10px] font-semibold text-white">최종 후보 비교</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewCandidate({ district, dong, reasons }: { district: string; dong: string; reasons: string[] }) {
  return (
    <article className="rounded-lg border border-[#1888e8] bg-white p-4 ring-1 ring-[#1888e8]">
      <div className="flex items-start justify-between gap-2">
        <div><p className="text-[9px] text-[#8a91a0]">{district}</p><p className="mt-1 text-sm font-semibold text-[#17203b]">{dong}</p></div>
        <span className="rounded-full bg-[#eaf4ff] px-2 py-1 text-[9px] font-semibold text-[#1888e8]">최종 후보</span>
      </div>
      <p className="mt-4 text-[9px] font-semibold uppercase tracking-[.1em] text-[#9299a8]">포함 근거</p>
      <ul className="mt-2 space-y-1 text-[10px] text-[#687083]">{reasons.map((reason) => <li key={reason}>· {reason}</li>)}</ul>
    </article>
  );
}

function DecisionProfilePreview() {
  return (
    <div className="rounded-xl border border-[#e0e4eb] bg-white p-5 shadow-[0_10px_30px_rgba(23,32,59,.06)]">
      <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#1888e8]">Decision profile</p>
      <h4 className="mt-3 text-lg font-semibold text-[#17203b]">현재 의사결정 기준</h4>
      <dl className="mt-5 space-y-4 text-sm">
        <div className="flex justify-between border-b border-[#eceef2] pb-3"><dt className="text-[#7c8495]">계약 유형</dt><dd className="font-semibold">월세</dd></div>
        <div className="flex justify-between border-b border-[#eceef2] pb-3"><dt className="text-[#7c8495]">월 주거비</dt><dd className="font-semibold">80만원 이하</dd></div>
        <div><dt className="text-[#7c8495]">우선 확인</dt><dd className="mt-3 flex flex-wrap gap-2">{["주거 비용", "생활 편의", "야간 환경"].map((item) => <span className="rounded-full bg-[#f0f4f8] px-3 py-1.5 text-xs text-[#566174]" key={item}>{item}</span>)}</dd></div>
      </dl>
    </div>
  );
}

function ComparisonPreview() {
  return (
    <div className="rounded-xl border border-[#e0e4eb] bg-white p-5 shadow-[0_10px_30px_rgba(23,32,59,.06)]">
      <div className="grid grid-cols-[1fr_70px_1fr] items-end border-b border-[#eceef2] pb-4 text-center">
        <strong>망원2동</strong><span className="text-[10px] font-semibold text-[#8b92a1]">비교 기준</span><strong>성수1가1동</strong>
      </div>
      <div className="divide-y divide-[#eceef2] text-sm">
        {[["서울 평균보다 낮음", "가격", "서울 평균보다 높음"], ["데이터 확인", "생활 편의", "데이터 확인"], ["현장 확인 필요", "야간 환경", "현장 확인 필요"]].map((row) => (
          <div className="grid grid-cols-[1fr_70px_1fr] items-center py-4 text-center" key={row[1]}><span>{row[0]}</span><span className="text-xs text-[#8b92a1]">{row[1]}</span><span>{row[2]}</span></div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="landing !bg-[#f7f8fa] !text-[#17203b]">
      <LandingScrollEffects />
      <header className="relative z-20 border-b border-[#e1e4ea] bg-white">
        <div className="mx-auto flex h-20 max-w-[1240px] items-center justify-between px-5 sm:px-8">
          <a className="w-[164px] text-[#17203b]" href="#top" aria-label="SweetHome 홈"><BrandLogo /></a>
          <nav className="hidden items-center gap-8 text-sm text-[#626a7c] sm:flex"><a href="#product">제품</a><a href="#process">이용 방법</a><a href="#principles">원칙</a></nav>
          <ArrowLink className="inline-flex items-center gap-5 rounded-lg bg-[#17203b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#273453]">서비스 시작</ArrowLink>
        </div>
      </header>

      <section className="border-b border-[#e1e4ea] bg-white" id="top">
        <div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[.85fr_1.15fr] lg:items-center lg:py-24">
          <div data-scroll-reveal>
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#1888e8]">Seoul housing decision support</p>
            <h1 className="mt-6 max-w-xl text-5xl font-medium leading-[1.04] tracking-[-.055em] sm:text-6xl">집을 찾기 전에,<br />살펴볼 지역부터<br />정리합니다.</h1>
            <p className="mt-7 max-w-lg text-base leading-7 text-[#626a7c]">예산과 생활 조건을 정리하고, 서울의 지역 데이터를 같은 기준으로 비교해 실제로 확인할 후보를 좁혀보세요.</p>
            <div className="mt-9 flex flex-wrap items-center gap-5"><ArrowLink className="inline-flex items-center gap-8 rounded-lg bg-[#17203b] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#273453]">내 조건으로 시작하기</ArrowLink><a className="text-sm font-semibold text-[#566074]" href="#product">제품 살펴보기 ↓</a></div>
            <p className="mt-7 text-xs leading-5 text-[#9299a7]">특정 지역을 정답처럼 추천하지 않습니다.<br />사용자가 판단할 수 있도록 조건과 근거를 정리합니다.</p>
          </div>
          <div data-scroll-float><WorkspacePreview /></div>
        </div>
      </section>

      <section className="bg-[#f7f8fa]">
        <div className="mx-auto grid max-w-[1240px] gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[1.25fr_.75fr] lg:items-center lg:py-20" data-scroll-reveal>
          <div className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-[#eaf5ff]">
            <Image
              alt="서울 지도 위에서 두 후보 지역의 생활 데이터를 비교하는 SweetHome 집 캐릭터"
              className="h-auto w-full"
              height={941}
              priority
              src="/sweethome-brand-illustration.png"
              width={1672}
            />
          </div>
          <div className="lg:pl-6">
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#1888e8]">A clearer place to start</p>
            <h2 className="mt-5 text-3xl font-medium leading-[1.15] tracking-[-.04em] sm:text-4xl">서울이 낯설어도,<br />후보를 비교할 기준은<br />선명할 수 있습니다.</h2>
            <p className="mt-6 max-w-md text-sm leading-7 text-[#626a7c]">가격, 생활 편의, 이동과 주거환경에 관한 데이터를 한곳에 모아 직접 확인할 지역부터 차근차근 좁혀갑니다.</p>
          </div>
        </div>
      </section>

      <section className="bg-[#f7f8fa]" id="product">
        <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:py-28">
          <div className="grid gap-8 border-b border-[#dfe3e9] pb-16 lg:grid-cols-[.45fr_1fr]" data-scroll-reveal><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#7f8797]">Product thesis</p><div><h2 className="max-w-4xl text-4xl font-medium leading-[1.12] tracking-[-.045em] sm:text-5xl">정보를 더 보여주는 대신,<br />선택지를 줄여드립니다.</h2><p className="mt-6 max-w-2xl text-base leading-7 text-[#626a7c]">매물 수나 하나의 종합점수로 결론을 내리지 않습니다. 사용자의 조건과 지역 데이터를 연결해 후보가 남은 이유와 확인할 부분을 보여줍니다.</p></div></div>

          <div className="mt-16 grid gap-6 lg:grid-cols-2" id="principles">
            <DecisionProfilePreview />
            <ComparisonPreview />
          </div>
        </div>
      </section>

      <section className="border-y border-[#e1e4ea] bg-white" id="process">
        <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:py-28">
          <div className="grid gap-8 lg:grid-cols-[.45fr_1fr]" data-scroll-reveal><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#7f8797]">How it works</p><h2 className="text-4xl font-medium leading-[1.12] tracking-[-.045em] sm:text-5xl">찾는 과정부터<br />결정하는 과정까지</h2></div>
          <div className="mt-16 border-t border-[#dfe3e9]">
            {FLOW.map((item) => <article className="grid gap-6 border-b border-[#dfe3e9] py-10 sm:grid-cols-[90px_1fr_1fr] sm:items-start" data-scroll-reveal key={item.number}><p className="text-xs font-semibold text-[#1888e8]">{item.number}</p><div><p className="text-xs font-semibold uppercase tracking-[.12em] text-[#8a91a0]">{item.label}</p><h3 className="mt-3 text-2xl font-medium leading-tight tracking-[-.035em]">{item.title.split("\n").map((line) => <span className="block" key={line}>{line}</span>)}</h3></div><p className="max-w-lg text-sm leading-7 text-[#656d7e] sm:pt-7">{item.description}</p></article>)}
          </div>
        </div>
      </section>

      <section className="bg-[#17203b] text-white">
        <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-end lg:py-24" data-scroll-reveal>
          <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#91cfff]">Start your decision</p><h2 className="mt-5 text-4xl font-medium leading-[1.12] tracking-[-.045em] sm:text-5xl">어디부터 살펴볼지,<br />내 조건으로 정리해 보세요.</h2></div>
          <ArrowLink className="inline-flex items-center justify-between gap-12 rounded-lg bg-white px-5 py-4 text-sm font-semibold text-[#17203b] transition hover:bg-[#edf4fb]">SweetHome 시작하기</ArrowLink>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#17203b] text-white"><div className="mx-auto flex max-w-[1240px] flex-col gap-5 px-5 py-8 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between sm:px-8"><a className="w-[150px] text-white" href="#top"><BrandLogo /></a><p>Data for a better place to live</p><p>© 2026 SweetHome</p></div></footer>
    </main>
  );
}
