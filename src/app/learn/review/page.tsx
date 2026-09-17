import type { Metadata } from "next";
import { ReviewView } from "@/components/learn/phrase-study";
import { getPhraseIndex } from "@/lib/content/loader";

export const metadata: Metadata = {
  title: "Повторение",
  description: "Интервальное повторение фраз из курса Español Real: 1, 3, 7, 30 и 90 дней.",
  alternates: { canonical: "/learn/review" },
};

export default function ReviewPage() {
  return <ReviewView phrases={getPhraseIndex()} />;
}
