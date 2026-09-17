import type { Metadata } from "next";
import { SettingsView } from "@/components/learn/settings-view";

export const metadata: Metadata = {
  title: "Настройки",
  description: "Тема, цель на день, активация Premium-ключа и резервная копия прогресса.",
  alternates: { canonical: "/learn/settings" },
};

export default function SettingsPage() {
  return <SettingsView />;
}
