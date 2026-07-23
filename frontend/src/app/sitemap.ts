import type { MetadataRoute } from "next";

import { SEO_GUIDES } from "@/lib/seo-guides";
import { siteUrl } from "@/lib/site-url";

type PublicRoute = {
  path: string;
  priority: number;
  changeFrequency: NonNullable<
    MetadataRoute.Sitemap[number]["changeFrequency"]
  >;
  lastModified: string;
};

const PUBLIC_ROUTES: PublicRoute[] = [
  {
    path: "/",
    priority: 1,
    changeFrequency: "weekly",
    lastModified: "2026-07-23",
  },
  {
    path: "/seoul-neighborhood-guide",
    priority: 0.9,
    changeFrequency: "monthly",
    lastModified: "2026-07-23",
  },
  {
    path: "/app",
    priority: 0.9,
    changeFrequency: "weekly",
    lastModified: "2026-07-16",
  },
  {
    path: "/app/report-map",
    priority: 0.8,
    changeFrequency: "weekly",
    lastModified: "2026-07-16",
  },
  {
    path: "/data-policy",
    priority: 0.4,
    changeFrequency: "monthly",
    lastModified: "2026-07-16",
  },
  {
    path: "/terms",
    priority: 0.2,
    changeFrequency: "yearly",
    lastModified: "2026-07-16",
  },
  {
    path: "/privacy",
    priority: 0.2,
    changeFrequency: "yearly",
    lastModified: "2026-07-18",
  },
  ...SEO_GUIDES.map((guide) => ({
    path: guide.path,
    priority: 0.8,
    changeFrequency: "monthly" as const,
    lastModified: guide.modifiedAt.slice(0, 10),
  })),
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteUrl();

  return PUBLIC_ROUTES.map(
    ({ path, priority, changeFrequency, lastModified }) => ({
    url: new URL(path, baseUrl).toString(),
    changeFrequency,
    priority,
      lastModified,
    }),
  );
}
