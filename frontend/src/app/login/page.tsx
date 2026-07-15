import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";

export default function LoginPage() {
  const redirectPath = "/app";
  const loginUrl = `/.auth/login/aad?post_login_redirect_uri=${encodeURIComponent(redirectPath)}`;

  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f7f9] p-5 text-[#17203b]">
      <section className="w-full max-w-md rounded-2xl border border-[#dfe3ea] bg-white p-8 shadow-[0_18px_50px_rgba(23,32,59,.10)]">
        <Link className="inline-block w-40" href="/" aria-label="SweetHome 홈">
          <BrandLogo />
        </Link>
        <p className="mt-10 text-xs font-semibold uppercase tracking-[.14em] text-[#1888e8]">
          My reports
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-.04em]">
          내 리포트를 저장하려면 로그인해 주세요
        </h1>
        <p className="mt-5 text-sm leading-7 text-[#697184]">
          비교와 지도 탐색은 로그인 없이 이용할 수 있습니다. 로그인 정보는 Azure가
          관리하며 SweetHome은 비밀번호나 인증 토큰을 저장하지 않습니다.
        </p>
        <a
          className="mt-8 block rounded-lg bg-[#17203b] px-5 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-[#273453]"
          href={loginUrl}
        >
          Microsoft 계정으로 로그인
        </a>
        <Link className="mt-4 block text-center text-sm font-semibold text-[#687083]" href="/app">
          로그인 없이 서비스 둘러보기
        </Link>
      </section>
    </main>
  );
}
