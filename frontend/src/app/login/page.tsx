import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";

export default function LoginPage() {
  const redirectPath = "/app";
  const encodedRedirect = encodeURIComponent(redirectPath);
  const googleLoginUrl = `/.auth/login/google?post_login_redirect_uri=${encodedRedirect}`;
  const githubLoginUrl = `/.auth/login/github?post_login_redirect_uri=${encodedRedirect}`;

  return (
    <main className="relative min-h-screen overflow-hidden bg-canvas text-ink">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-[12%] top-[48%] h-[34rem] w-[46rem] rounded-full bg-blush/75 blur-[110px]" />
        <div className="absolute left-[30%] top-[55%] h-[26rem] w-[38rem] rounded-full bg-peach/80 blur-[105px]" />
        <div className="absolute -right-[10%] top-[32%] h-[32rem] w-[42rem] rounded-full bg-mint/85 blur-[120px]" />
      </div>

      <header className="relative z-10 flex h-20 items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link className="w-36 text-ink transition hover:opacity-65" href="/" aria-label="SweetHome 홈">
          <BrandLogo />
        </Link>
        <Link
          className="rounded-full bg-ink/[0.06] px-4 py-2 text-xs font-semibold text-muted transition hover:bg-ink/10 hover:text-ink"
          href="/app"
        >
          서비스 둘러보기
        </Link>
      </header>

      <div className="relative z-10 grid min-h-[calc(100vh-5rem)] place-items-center px-5 pb-20 pt-8 sm:pb-28">
        <section className="w-full max-w-[430px] overflow-hidden rounded-[1.75rem] border border-white/90 bg-white/85 shadow-[0_28px_80px_rgba(67,62,63,0.10)] backdrop-blur-xl">
          <div className="px-7 pb-7 pt-8 sm:px-9 sm:pb-9 sm:pt-9">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-soft text-muted">
              <BrandLogo className="h-7 w-7" markOnly />
            </div>

            <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.18em] text-subtle">
              My SweetHome
            </p>
            <h1 className="mt-3 text-[1.75rem] font-bold leading-[1.25] tracking-[-0.045em] text-ink-strong sm:text-[2rem]">
              내 비교 기록을<br />안전하게 이어보세요
            </h1>
            <p className="mt-4 text-sm leading-6 text-muted">
              저장한 후보와 나만의 리포트를 한곳에서 관리할 수 있도록 로그인을 준비했습니다.
            </p>

            <a
              className="mt-8 flex min-h-13 items-center justify-center gap-3 rounded-xl bg-ink px-5 py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(48,50,52,0.16)] transition hover:-translate-y-0.5 hover:bg-charcoal hover:shadow-[0_14px_30px_rgba(48,50,52,0.22)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              href={googleLoginUrl}
            >
              <GoogleMark />
              Google로 계속하기
            </a>

            <a
              className="mt-3 flex min-h-12 items-center justify-center gap-3 rounded-xl border border-line bg-canvas px-5 py-3 text-sm font-semibold text-ink transition hover:bg-surface-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              href={githubLoginUrl}
            >
              <GitHubMark />
              GitHub로 계속하기
            </a>

            <div className="my-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">
              <span className="h-px flex-1 bg-line" />
              또는
              <span className="h-px flex-1 bg-line" />
            </div>

            <Link
              className="flex min-h-10 items-center justify-center text-sm font-semibold text-muted transition hover:text-ink"
              href="/app"
            >
              로그인 없이 둘러보기
            </Link>
          </div>

          <div className="border-t border-line bg-white/55 px-7 py-5 sm:px-9">
            <div className="flex items-start gap-3">
              <ShieldIcon />
              <p className="text-xs leading-5 text-muted">
                인증은 Google·GitHub와 Azure가 처리합니다. SweetHome은 비밀번호나 인증 토큰을 저장하지 않습니다.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24">
      <path d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.55h3.24c1.9-1.75 2.98-4.33 2.98-7.42Z" fill="#4285F4" />
      <path d="M12 22c2.7 0 4.98-.9 6.63-2.35l-3.24-2.55c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.63A10 10 0 0 0 12 22Z" fill="#34A853" />
      <path d="M6.39 13.93A6 6 0 0 1 6.08 12c0-.67.12-1.32.31-1.93V7.44H3.04A10 10 0 0 0 2 12c0 1.64.39 3.2 1.04 4.56l3.35-2.63Z" fill="#FBBC05" />
      <path d="M12 5.94c1.47 0 2.79.5 3.82 1.5l2.88-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.44l3.35 2.63C7.18 7.7 9.39 5.94 12 5.94Z" fill="#EA4335" />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg aria-hidden="true" className="h-[19px] w-[19px]" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49 0-.24-.01-1.05-.01-1.9-2.78.62-3.37-1.2-3.37-1.2-.45-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .08 1.53 1.06 1.53 1.06.9 1.57 2.35 1.12 2.92.85.09-.66.35-1.12.64-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.35 9.35 0 0 1 12 6.93a9.3 9.3 0 0 1 2.5.35c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.06.36.32.68.95.68 1.92 0 1.38-.01 2.5-.01 2.84 0 .27.18.59.69.49A10.22 10.22 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-subtle" fill="none" viewBox="0 0 20 20">
      <path d="M10 2.5 16 5v4.4c0 3.8-2.4 6.3-6 8.1-3.6-1.8-6-4.3-6-8.1V5l6-2.5Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="m7.4 9.8 1.7 1.7 3.7-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}
