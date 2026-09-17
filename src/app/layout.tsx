import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ProgressProvider } from "@/components/providers/progress-provider";
import { PwaRegister } from "@/components/providers/pwa-register";
import { getCourseStats, getLessonMetas } from "@/lib/content/loader";
import { course, payments } from "@/lib/content/config";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://espanol-real.example.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Español Real — учим живой испанский для жизни в Испании",
    template: "%s · Español Real",
  },
  description:
    "Мастерство реальных испанских фраз вместо заучивания грамматики. 45 уроков по учебнику «Español Real»: квартира, банк, врач, документы, работа.",
  keywords: [
    "испанский язык",
    "испанский для жизни в Испании",
    "разговорный испанский",
    "Español Real",
    "курс испанского",
    "испанский для эмигрантов",
  ],
  applicationName: "Español Real",
  authors: [{ name: course.author.name }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: siteUrl,
    siteName: "Español Real",
    title: "Español Real — живой испанский для жизни в Испании",
    description:
      "Реальные фразы, которые слышно на улицах Испании. Карта адаптации, повторение по расписанию, 45 уроков.",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Español Real" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Español Real — живой испанский для жизни в Испании",
    description: "Мастерство реальных фраз вместо заучивания грамматики. 45 уроков.",
  },
  robots: { index: true, follow: true },
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }], apple: "/icon.svg" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ff5a3c" },
    { media: "(prefers-color-scheme: dark)", color: "#14100e" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const metas = getLessonMetas();
  const stats = getCourseStats();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "Español Real",
    description: course.subtitle,
    inLanguage: "es",
    educationalLevel: "A1-B2",
    provider: { "@type": "Organization", name: course.author.name },
    numberOfCredits: stats.phrases,
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: "PT15M",
    },
    offers: [
      { "@type": "Offer", price: "0", priceCurrency: "XTR", name: "Free" },
      { "@type": "Offer", price: String(payments.starsPrice), priceCurrency: "XTR", name: "Premium" },
    ],
  };

  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var r=localStorage.getItem('espanol-real:progress:v1');var t=r?((JSON.parse(r).settings||{}).theme):'system';var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ProgressProvider metas={metas}>
          <AuthProvider>{children}</AuthProvider>
        </ProgressProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
