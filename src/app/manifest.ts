import type { MetadataRoute } from "next";

// Required for `output: "export"` builds.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Español Real| Cristina Perez",
    short_name: "Español Real",
    description:
      "Español Real | CristinaPerez — Разговорный испанский по авторскому учебнику: реальные фразы, карта адаптации, интервальное повторение",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ff8c00",
    lang: "ru",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };
}