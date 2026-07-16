export function safeRedirectPath(value: string | undefined, fallback = "/app") {
  if (
    !value
    || !value.startsWith("/")
    || value.startsWith("//")
    || value.includes("\\")
    || /[\u0000-\u001f]/.test(value)
  ) return fallback;
  return value;
}

const AUTH_FLOW_PATHS = ["/login", "/auth", "/.auth", "/api"];

export function safePostAuthRedirectPath(
  value: string | undefined,
  fallback = "/app",
) {
  const redirectPath = safeRedirectPath(value, fallback);
  const pathname = new URL(redirectPath, "https://sweethome.invalid").pathname;
  return AUTH_FLOW_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )
    ? fallback
    : redirectPath;
}
