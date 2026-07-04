import { layoutStyles } from "@/styles/components";

export function AppHeader() {
  return (
    <header className="border-b border-[#d7e6df] bg-[#f7fbf8]/95">
      <div
        className={`${layoutStyles.section} flex h-24 items-center justify-between`}
      >
        <div className="leading-none">
          <div className="text-2xl font-black text-[#10231d]">SweetHome</div>
          <div className="mt-2 text-xs font-bold uppercase text-[#527367]">
            Seoul Region Compare
          </div>
        </div>
        <nav className="hidden items-center gap-12 text-lg font-bold text-[#203d34] md:flex">
          <a href="#entry">진입선택</a>
          <a href="#explore">후보탐색</a>
          <a href="#compare">지역비교</a>
          <a href="#basis">데이터기준</a>
        </nav>
        <button
          aria-label="메뉴 열기"
          className="flex h-12 w-12 items-center justify-center border border-[#176b57] bg-white"
          type="button"
        >
          <span className="h-0.5 w-7 bg-[#176b57] shadow-[0_8px_0_#176b57,0_-8px_0_#176b57]" />
        </button>
      </div>
    </header>
  );
}
