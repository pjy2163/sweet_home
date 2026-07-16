import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { SiteFooter } from "@/components/site-footer";

export function PolicyLayout({
  children,
  description,
  effectiveDate,
  title,
}: {
  children: React.ReactNode;
  description: string;
  effectiveDate: string;
  title: string;
}) {
  return (
    <main className="warm-canvas min-h-screen text-ink">
      <header className="border-b border-line bg-white/84 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1040px] items-center justify-between px-5 sm:px-8">
          <Link className="w-40" href="/"><BrandLogo /></Link>
          <Link className="text-sm font-semibold text-muted hover:text-ink" href="/">홈으로</Link>
        </div>
      </header>
      <article className="mx-auto max-w-[1040px] px-5 py-14 sm:px-8 sm:py-20">
        <p className="text-xs font-bold tracking-[0.1em] text-sage-strong">SWEETHOME POLICY</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">{title}</h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-muted">{description}</p>
        <p className="mt-5 text-xs text-subtle">시행일 {effectiveDate}</p>
        <div className="policy-content mt-12 rounded-3xl border border-line bg-white/90 p-6 shadow-[0_18px_60px_rgba(52,78,68,0.06)] sm:p-10">
          {children}
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}

export function PolicySection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="border-t border-line py-8 first:border-t-0 first:pt-0 last:pb-0">
      <h2 className="text-xl font-semibold tracking-[-0.025em]">{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-7 text-muted">{children}</div>
    </section>
  );
}
