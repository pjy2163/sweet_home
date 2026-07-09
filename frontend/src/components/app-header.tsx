import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { layoutStyles } from "@/styles/components";

export function AppHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-20 border-b border-white/20 text-white">
      <div
        className={`${layoutStyles.section} flex h-20 items-center justify-between`}
      >
        <Link className="flex items-center gap-3" href="/">
          <BrandLogo className="h-10 w-auto" />
        </Link>
        <nav className="hidden items-center gap-9 text-sm font-semibold md:flex">
          <a className="transition hover:opacity-60" href="#entry">시작하기</a>
          <a className="transition hover:opacity-60" href="#explore">후보 탐색</a>
          <a className="transition hover:opacity-60" href="#compare">지역 비교</a>
        </nav>
        <a
          className="rounded-full bg-[#dfff62] px-5 py-2.5 text-sm font-bold text-[#172019] transition hover:scale-[1.03]"
          href="#entry"
        >
          내 동네 찾기
        </a>
      </div>
    </header>
  );
}
