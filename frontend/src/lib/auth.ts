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
