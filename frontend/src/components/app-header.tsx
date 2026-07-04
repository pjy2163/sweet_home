import { layoutStyles } from "@/styles/components";

export function AppHeader() {
  return (
    <header className="border-b border-neutral-200 bg-[#fbfbf8]">
      <div
        className={`${layoutStyles.section} flex h-24 items-center justify-between`}
      >
        <div className="leading-none">
          <div className="text-2xl font-black">SweetHome</div>
          <div className="mt-2 text-xs font-bold uppercase text-neutral-500">
            Seoul Region Compare
          </div>
        </div>
        <nav className="hidden items-center gap-12 text-lg font-bold md:flex">
          <a href="#explore">후보탐색</a>
          <a href="#compare">지역비교</a>
          <a href="#basis">데이터기준</a>
        </nav>
        <button
          aria-label="메뉴 열기"
          className="flex h-12 w-12 items-center justify-center border border-neutral-950"
          type="button"
        >
          <span className="h-0.5 w-7 bg-neutral-950 shadow-[0_8px_0_#0a0a0a,0_-8px_0_#0a0a0a]" />
        </button>
      </div>
    </header>
  );
}
