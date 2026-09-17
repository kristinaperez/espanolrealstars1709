import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard/dashboard";

export const metadata: Metadata = {
  title: "Дашборд",
  description: "Ваш прогресс по курсу Español Real: XP, серия дней, карта адаптации и план повторения.",
  alternates: { canonical: "/learn" },
};

export default function LearnPage() {
  return <Dashboard />;
}
