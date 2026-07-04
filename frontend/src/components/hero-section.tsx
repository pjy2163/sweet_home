import { layoutStyles, textStyles } from "@/styles/components";

export function HeroSection() {
  return (
    <section
      className={`${layoutStyles.section} pb-16 pt-14 text-center lg:pt-20`}
    >
      <div className="mb-12 flex justify-center gap-3 text-sm font-semibold text-[#6a8178] md:justify-end">
        <span>홈</span>
        <span>/</span>
        <span>지역비교</span>
        <span>/</span>
        <span className="text-[#176b57]">후보지 선택</span>
      </div>
      <h1 className={textStyles.heroTitle}>
        동네를 고르는 기준,
        <br />
        데이터로 비교하세요
      </h1>
      <p className="mx-auto mt-8 max-w-3xl text-lg font-semibold leading-8 text-[#526b62] sm:text-xl">
        서울 행정동 후보지를 비용, 생활인구, 안전 proxy, 생활편의 데이터로
        나란히 확인합니다.
      </p>
    </section>
  );
}
