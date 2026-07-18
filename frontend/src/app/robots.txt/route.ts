import { siteUrl } from "@/lib/site-url";

const DAUM_WEBMASTER_VERIFICATION =
  "#DaumWebMasterTool:c3d289e29ffdb0e83f2f0d1b037b0150bad43501f46d570869737cf4dcbd8508:BUPNpxnP/l/bJvqx7TxdCA==";

export const dynamic = "force-static";

export function robotsText(): string {
  const baseUrl = siteUrl();

  return [
    "User-Agent: *",
    "Allow: /",
    "Disallow: /.auth/",
    "Disallow: /api/",
    "",
    `Sitemap: ${new URL("/sitemap.xml", baseUrl).toString()}`,
    `Host: ${baseUrl.origin}`,
    "",
    DAUM_WEBMASTER_VERIFICATION,
    "",
  ].join("\n");
}

export function GET(): Response {
  return new Response(robotsText(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
