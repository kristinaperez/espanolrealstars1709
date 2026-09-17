import type { MetadataRoute } from "next";

// Required for `output: "export"` builds.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Español Real — живой испанский для жизни в Испании",
    short_name: "Español Real",
    description:
      "Разговорный испанский по авторскому учебнику: реальные фразы, карта адаптации, интервальное повторение.",
    start_url: "/learn",
    display: "standalone",
    background_color: "#fff8f1",
    theme_color: "#ff5a3c",
    lang: "ru",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
