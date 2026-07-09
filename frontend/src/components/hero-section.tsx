import { layoutStyles } from "@/styles/components";

export function HeroSection() {
  return (
    <section className="relative min-h-[760px] overflow-hidden bg-[#173d31] text-white">
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="hero-orbit absolute -right-40 top-28 h-[620px] w-[620px] rounded-full border border-white/20">
        <div className="absolute inset-16 rounded-full border border-white/15" />
        <div className="absolute inset-36 rounded-full border border-[#dfff62]/60" />
        <span className="absolute left-16 top-24 h-4 w-4 rounded-full bg-[#dfff62] shadow-[0_0_35px_#dfff62]" />
      </div>
      <div className={`${layoutStyles.section} relative flex min-h-[760px] flex-col justify-end pb-16 pt-36`}>
        <div className="mb-auto flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-white/60">
          <span className="h-2 w-2 rounded-full bg-[#dfff62]" />
          Seoul Living Intelligence
        </div>
        <h1 className="max-w-6xl text-[clamp(3.6rem,9vw,8.5rem)] font-medium leading-[0.88] tracking-[-0.075em]">
          데이터로 완성하는
          <br />
          <span className="text-[#dfff62]">주거 의사결정</span>
        </h1>
        <div className="mt-12 grid gap-8 border-t border-white/25 pt-7 md:grid-cols-[1fr_1fr] md:items-end">
          <p className="max-w-xl text-base leading-7 text-white/70 sm:text-lg">
            감이나 소문 대신, 가격·생활인구·안전·편의 데이터를 한눈에
            서울의 수많은 동네 사이에서 나에게 맞는 선택을 선명하게 만듭니다
          </p>
          <a className="group flex items-center justify-between border-b border-white/40 pb-3 text-lg font-semibold md:ml-auto md:w-72" href="#entry">
            데이터로 탐색 시작
            <span className="transition group-hover:translate-x-2">↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}
