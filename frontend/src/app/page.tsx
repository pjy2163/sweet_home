import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { LandingScrollEffects } from "@/components/landing-scroll-effects";

const APP_URL = "/app";

function LivingDataGraph() {
  return (
    <div className="living-graph" aria-hidden="true">
      <svg viewBox="0 0 900 620" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="graph-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dfff62" stopOpacity=".28" />
            <stop offset="1" stopColor="#dfff62" stopOpacity="0" />
          </linearGradient>
          <filter id="graph-glow">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <g className="graph-guides">
          {[90, 190, 290, 390, 490].map((y) => <line key={y} x1="0" x2="900" y1={y} y2={y} />)}
          {[100, 260, 420, 580, 740].map((x) => <line key={x} x1={x} x2={x} y1="0" y2="620" />)}
        </g>
        <path
          className="graph-area"
          d="M0 485 C85 470 110 390 190 412 S310 505 385 390 S500 180 575 250 S690 415 760 270 S845 105 900 135 L900 620 L0 620 Z"
        />
        <path
          className="graph-line graph-line-main"
          d="M0 485 C85 470 110 390 190 412 S310 505 385 390 S500 180 575 250 S690 415 760 270 S845 105 900 135"
        />
        <path
          className="graph-line graph-line-soft"
          d="M0 350 C90 320 130 370 210 335 S350 205 430 270 S545 410 640 340 S780 225 900 245"
        />
        <g className="graph-node node-a"><circle cx="190" cy="412" r="6" /><circle cx="190" cy="412" r="16" /></g>
        <g className="graph-node node-b"><circle cx="575" cy="250" r="6" /><circle cx="575" cy="250" r="16" /></g>
        <g className="graph-node node-c"><circle cx="760" cy="270" r="6" /><circle cx="760" cy="270" r="16" /></g>
      </svg>
      <div className="graph-chip chip-price"><span>가격</span><strong>−8.2%</strong><small>서울 평균 대비</small></div>
      <div className="graph-chip chip-safety"><span>안전</span><strong>82</strong><small>관측 지표</small></div>
      <div className="graph-chip chip-life"><span>생활 편의</span><strong>94</strong><small>후보 지역</small></div>
      <p className="graph-axis">SEOUL / 424 DONG</p>
    </div>
  );
}

function ExternalAppLink({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <Link
      className={className}
      href={APP_URL}
    >
      {children}
      <span aria-hidden="true">→</span>
    </Link>
  );
}

function ProductDemo() {
  return (
    <div className="product-demo" aria-label="SweetHome 서비스 화면 미리보기">
      <div className="demo-bar">
        <div className="flex items-center gap-2">
          <span />
          <span />
          <span />
        </div>
        <p>SWEETHOME / SEOUL</p>
        <p className="hidden sm:block">LIVE DATA</p>
      </div>
      <div className="demo-grid">
        <aside className="demo-sidebar">
          <div>
            <p className="demo-label">MY PRIORITY</p>
            <h3>나에게 중요한<br />조건은?</h3>
          </div>
          <div className="grid gap-2">
            {["안전", "생활 편의", "합리적 가격", "생활 인구"].map(
              (condition, index) => (
                <div
                  className={`demo-condition demo-condition-${index + 1}`}
                  key={condition}
                >
                  <span>{condition}</span>
                  <span>0{index + 1}</span>
                </div>
              ),
            )}
          </div>
        </aside>
        <div
          className="demo-map"
          style={{ "--map-art": "url(/sweethome-map-background.png)" } as React.CSSProperties}
        >
          <svg className="seoul-map" viewBox="0 0 760 620" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <g className="districts">
              <path d="M8 72 L151 30 239 92 216 180 91 198 15 141Z" />
              <path d="M239 92 L354 42 449 110 421 203 296 225 216 180Z" />
              <path d="M449 110 L603 61 749 132 706 241 565 225 421 203Z" />
              <path d="M15 141 L91 198 111 304 25 372 -23 287Z" />
              <path d="M91 198 L216 180 296 225 274 340 143 372 111 304Z" />
              <path d="M296 225 L421 203 565 225 527 353 390 381 274 340Z" />
              <path d="M565 225 L706 241 781 336 676 403 527 353Z" />
              <path d="M25 372 L143 372 217 465 159 596 18 554 -28 452Z" />
              <path d="M143 372 L274 340 390 381 372 509 217 465Z" />
              <path d="M390 381 L527 353 676 403 619 526 477 566 372 509Z" />
              <path d="M676 403 L781 336 785 553 619 526Z" />
            </g>
            <g className="map-river">
              <path d="M-20 335 C105 290 185 354 294 332 S475 274 573 321 S681 385 790 337" />
              <path d="M-20 362 C105 317 185 381 294 359 S475 301 573 348 S681 412 790 364" />
            </g>
            <g className="map-streets">
              <path d="M68 0 C110 150 192 210 310 274 S490 390 540 620" />
              <path d="M620 0 C560 121 520 190 441 257 S320 414 287 620" />
              <path d="M0 234 C160 246 271 175 402 157 S626 173 760 225" />
              <path d="M0 480 C164 421 309 461 455 471 S625 457 760 408" />
            </g>
          </svg>
          <div className="map-road road-one" />
          <div className="map-road road-two" />
          <span className="map-dot dot-one" />
          <span className="map-dot dot-two" />
          <span className="map-dot dot-three" />
          <div className="map-card card-one">
            <p>01 성수1가1동</p>
            <strong>86</strong>
            <span>생활편의 · 생활인구</span>
          </div>
          <div className="map-card card-two">
            <p>02 공릉1동</p>
            <strong>79</strong>
            <span>가격 · 안전</span>
          </div>
          <p className="map-caption">데이터가 발견한<br />당신의 다음 동네</p>
        </div>
      </div>
    </div>
  );
}

const STORY = [
  {
    number: "01",
    eyebrow: "Discover",
    title: "막연한 기준을\n선명한 조건으로",
    body: "안전, 가격, 편의, 생활인구 중요하게 생각하는 조건을 고르면\n데이터가 탐색의 출발점을 만듭니다.",
    visual: (
      <div className="story-visual visual-priority">
        <p>나에게 중요한 것</p>
        {["안전한 귀갓길", "생활이 편리한 곳", "부담 없는 가격"].map(
          (item, index) => (
            <div key={item}>
              <span>0{index + 1}</span>
              <strong>{item}</strong>
              <span className="check">✓</span>
            </div>
          ),
        )}
      </div>
    ),
  },
  {
    number: "02",
    eyebrow: "Explore",
    title: "서울의 동네를\n데이터로 발견하고",
    body: "선택한 조건과 연결된 지표가 관측되는 행정동을 찾아,\n미처 떠올리지 못했던 후보까지 넓혀봅니다.",
    visual: (
      <div className="story-visual visual-rank">
        <p>조건 기준 후보군</p>
        <div className="rank-head"><span>지역</span><span>매치</span></div>
        {[
          ["성수1가1동", "04", "92%"],
          ["공릉1동", "03", "84%"],
          ["망원2동", "03", "76%"],
        ].map((item, index) => (
          <div className="rank-row" key={item[0]}>
            <span>0{index + 1}</span><strong>{item[0]}</strong><span>{item[1]}</span><em>{item[2]}</em>
          </div>
        ))}
      </div>
    ),
  },
  {
    number: "03",
    eyebrow: "Compare",
    title: "감이 아닌 근거로\n나란히 비교합니다",
    body: "두 후보의 가격, 안전, 편의, 생활인구를 같은 기준 위에 놓고 차이를 빠르게 읽습니다.",
    visual: (
      <div className="story-visual visual-compare">
        <div className="compare-head"><p>성수1가1동</p><span>VS</span><p>공릉1동</p></div>
        {[
          ["가격", "68", "88"],
          ["안전", "82", "79"],
          ["편의", "94", "73"],
          ["생활인구", "89", "75"],
        ].map((item) => (
          <div className="compare-row" key={item[0]}>
            <strong>{item[1]}</strong><span>{item[0]}</span><strong>{item[2]}</strong>
          </div>
        ))}
      </div>
    ),
  },
];

export default function LandingPage() {
  return (
    <main className="landing">
      <LandingScrollEffects />
      <header className="landing-header">
        <a className="brand" href="#">
          <BrandLogo />
        </a>
        <nav>
          <a href="#why">소개</a>
          <a href="#how">이용 방법</a>
        </nav>
        <ExternalAppLink className="header-cta">서비스 시작</ExternalAppLink>
      </header>

      <section className="landing-hero">
        <LivingDataGraph />
        <p className="hero-kicker"><span /> Seoul Living Intelligence</p>
        <div className="hero-title-group">
          <h1>
            데이터로 완성하는
            <br />
            <em>주거 의사결정</em>
          </h1>
        </div>
        <p className="hero-note">
          서울의 데이터를 읽고, 나에게 맞는 동네를 발견하세요
        </p>
      </section>

      <section className="insert-section" data-scroll-reveal id="why">
        <div className="insert-copy">
          <p>001 — Product Film</p>
          <h2>수많은 숫자를,<br />하나의 선택으로</h2>
        </div>
        <div data-scroll-float>
          <ProductDemo />
        </div>
        <div className="insert-meta">
          <p>조건을 고르고</p><span>→</span><p>후보를 발견하고</p><span>→</span><p>차이를 비교합니다</p>
        </div>
      </section>

      <section className="story-section" id="how">
        <div className="story-intro" data-scroll-reveal>
          <p>002 — How it works</p>
          <h2>찾는 순간부터<br />결정하는 순간까지</h2>
        </div>
        <div className="story-stream">
          {STORY.map((item) => (
            <article className="story-chapter" data-scroll-reveal key={item.number}>
              <div className="story-copy">
                <p>{item.number} — {item.eyebrow}</p>
                <h3>{item.title.split("\n").map((line) => <span key={line}>{line}</span>)}</h3>
                <div className="story-line" />
                <p className="story-body">
                  {item.body.split("\n").map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </p>
              </div>
              {item.visual}
            </article>
          ))}
        </div>
      </section>

      <section className="final-cta" data-scroll-reveal>
        <p>READY TO MOVE?</p>
        <h2>다음 동네를 선택할<br />준비가 되셨나요?</h2>
        <ExternalAppLink className="final-button">SweetHome 사용하러 가기</ExternalAppLink>
        <div className="final-orbit"><span /></div>
      </section>

      <footer>
        <a className="brand" href="#"><BrandLogo /></a>
        <p>Data for a better place to live</p>
        <p>© 2026 SweetHome</p>
      </footer>
    </main>
  );
}
