import type { MetadataRoute } from "next";
import { getExamBlocks, getLessonNumbers } from "@/lib/content/loader";

// Required for `output: "export"` builds.
export const dynamic = "force-static";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://espanol-real.example.com";

/**
 * Generated from the JSON content, so adding lessons automatically extends the sitemap.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/learn`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/learn/lessons`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/learn/map`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/learn/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/learn/review`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/learn/search`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${siteUrl}/learn/settings`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/certificate`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];

  const lessonRoutes: MetadataRoute.Sitemap = getLessonNumbers().map((lesson) => ({
    url: `${siteUrl}/lesson/${lesson}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.9,
  }));

  const examRoutes: MetadataRoute.Sitemap = getExamBlocks().map((block) => ({
    url: `${siteUrl}/exam/${block.block}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...lessonRoutes, ...examRoutes];
}
