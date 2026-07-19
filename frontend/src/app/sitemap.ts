import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site-url";

const PUBLIC_ROUTES = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/seoul-neighborhood-guide", priority: 0.9, changeFrequency: "monthly" },
  { path: "/app", priority: 0.9, changeFrequency: "weekly" },
  { path: "/app/report-map", priority: 0.8, changeFrequency: "weekly" },
  { path: "/data-policy", priority: 0.4, changeFrequency: "monthly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteUrl();

  return PUBLIC_ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: new URL(path, baseUrl).toString(),
    changeFrequency,
    priority,
  }));
}
