import { AgreementGate } from "@/components/agreement-gate";
import { safeRedirectPath } from "@/lib/auth";

export default async function AuthCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string | string[] }>;
}) {
  const requestedRedirect = (await searchParams).redirect;
  const redirectPath = safeRedirectPath(
    Array.isArray(requestedRedirect) ? requestedRedirect[0] : requestedRedirect,
  );
  return <AgreementGate redirectPath={redirectPath} />;
}
