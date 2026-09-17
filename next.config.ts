import type { NextConfig } from "next";

/**
 * Español Real runs as a fully static site by default for free hosting
 * (Netlify, Cloudflare Pages, GitHub Pages, Render Static).
 *
 * `STATIC_EXPORT=true npm run build` → static HTML/CSS/JS in `./out`
 * The platform preview (with the /api/health endpoint) runs without the flag.
 */
const staticExport = process.env.STATIC_EXPORT === "true";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  ...(staticExport ? { output: "export" as const, trailingSlash: true } : {}),
};

export default nextConfig;
