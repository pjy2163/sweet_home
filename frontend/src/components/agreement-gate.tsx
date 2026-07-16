"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import {
  acceptCurrentAgreement,
  fetchAgreementStatus,
  fetchAuthSession,
} from "@/lib/api";
import { safePostAuthRedirectPath } from "@/lib/auth";

const AGREEMENT_LOAD_ERROR = "확인 내용을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
const AGREEMENT_SAVE_ERROR = "동의 내용을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";

export function AgreementGate({ redirectPath }: { redirectPath: string }) {
  const destination = safePostAuthRedirectPath(redirectPath);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "submitting" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function check() {
      try {
        const session = await fetchAuthSession();
        if (!session) {
          window.location.replace(`/login?redirect=${encodeURIComponent(destination)}`);
          return;
        }
        const agreement = await fetchAgreementStatus();
        if (!active) return;
        if (agreement?.accepted) {
          window.location.replace(destination);
          return;
        }
        setStatus("ready");
      } catch (error) {
        if (active) {
          setMessage(publicErrorMessage(error, AGREEMENT_LOAD_ERROR));
          setStatus("error");
        }
      }
    }
    void check();
    return () => { active = false; };
  }, [destination]);

  async function submitAgreement() {
    if (!termsAccepted || !privacyConfirmed) return;
    setStatus("submitting");
    setMessage("");
    try {
      await acceptCurrentAgreement();
      window.location.replace(destination);
    } catch (error) {
      setMessage(publicErrorMessage(error, AGREEMENT_SAVE_ERROR));
      setStatus("error");
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-canvas px-5 py-10 text-ink">
      <div className="pointer-events-none absolute inset-0 warm-canvas" aria-hidden="true" />
      <section className="relative mx-auto w-full max-w-[520px] overflow-hidden rounded-[1.75rem] border border-white/90 bg-white/90 shadow-[0_28px_80px_rgba(67,62,63,0.10)] backdrop-blur-xl">
        <div className="px-7 py-8 sm:px-10 sm:py-10">
          <Link className="block w-36" href="/"><BrandLogo /></Link>
          <p className="mt-10 text-[11px] font-bold uppercase tracking-[0.16em] text-sage-strong">FIRST SIGN IN</p>
          <h1 className="mt-3 text-[1.8rem] font-bold leading-[1.3] tracking-[-0.04em]">내 기록을 저장하기 전에<br />두 가지를 확인해 주세요</h1>
          <p className="mt-4 text-sm leading-6 text-muted">선택 동의나 마케팅 수신 항목은 없습니다. 서비스 운영에 필요한 내용만 확인합니다.</p>

          {status === "loading" ? <p className="mt-8 rounded-xl bg-surface-soft p-4 text-sm text-muted">로그인과 약관 확인 상태를 확인하고 있습니다.</p> : null}

          {status !== "loading" ? (
            <div className="mt-8 space-y-3">
              <div className="flex items-start gap-3 rounded-xl border border-line bg-white p-4 transition hover:border-sage-line">
                <input className="mt-1 h-4 w-4" id="terms-agreement" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} type="checkbox" />
                <div className="text-sm leading-6"><label className="cursor-pointer font-bold" htmlFor="terms-agreement">[필수] 서비스 이용약관 동의</label><br /><Link className="text-xs text-sage-strong underline underline-offset-4" href="/terms" target="_blank">이용약관 전문 보기</Link></div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-line bg-white p-4 transition hover:border-sage-line">
                <input className="mt-1 h-4 w-4" id="privacy-confirmation" checked={privacyConfirmed} onChange={(event) => setPrivacyConfirmed(event.target.checked)} type="checkbox" />
                <div className="text-sm leading-6"><label className="cursor-pointer font-bold" htmlFor="privacy-confirmation">[필수] 개인정보 처리 안내 확인</label><br /><span className="text-xs text-muted">인증 제공자·불투명 식별자·저장 리포트 · 이용 종료 또는 삭제 요청 시까지</span><br /><Link className="text-xs text-sage-strong underline underline-offset-4" href="/privacy" target="_blank">개인정보처리방침 보기</Link></div>
              </div>
            </div>
          ) : null}

          {message ? <p className="mt-4 text-xs font-semibold text-[#a94659]">{message}</p> : null}
          {status !== "loading" ? (
            <button
              className="mt-6 min-h-12 w-full rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white transition hover:bg-charcoal disabled:cursor-not-allowed disabled:opacity-35"
              disabled={!termsAccepted || !privacyConfirmed || status === "submitting"}
              onClick={() => void submitAgreement()}
              type="button"
            >
              {status === "submitting" ? "확인 내용 저장 중…" : "동의하고 계속하기"}
            </button>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function publicErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;

  const internalErrorPatterns = [
    /failed to execute/i,
    /unexpected end of json/i,
    /json\.parse/i,
    /syntaxerror/i,
  ];
  return internalErrorPatterns.some((pattern) => pattern.test(error.message))
    ? fallback
    : error.message || fallback;
}
