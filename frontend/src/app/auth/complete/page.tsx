import type { Metadata } from "next";

import { AgreementGate } from "@/components/agreement-gate";
import { safePostAuthRedirectPath } from "@/lib/auth";

export const metadata: Metadata = {
  title: "로그인 확인",
  robots: { index: false, follow: false },
};

export default async function AuthCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string | string[] }>;
}) {
  const requestedRedirect = (await searchParams).redirect;
  const redirectPath = safePostAuthRedirectPath(
    Array.isArray(requestedRedirect) ? requestedRedirect[0] : requestedRedirect,
  );
  return <AgreementGate redirectPath={redirectPath} />;
}
