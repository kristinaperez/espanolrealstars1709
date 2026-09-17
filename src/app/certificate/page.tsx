import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { CertificateView } from "@/components/learn/certificate-view";

export const metadata: Metadata = {
  title: "Сертификат о прохождении",
  description: "Сертификат о прохождении курса Español Real с итоговыми XP, уровнем и точностью ответов.",
  alternates: { canonical: "/certificate" },
};

export default function CertificatePage() {
  return (
    <AppShell>
      <CertificateView />
    </AppShell>
  );
}
