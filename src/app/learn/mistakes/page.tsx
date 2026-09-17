import type { Metadata } from "next";
import { MistakesView } from "@/components/learn/phrase-study";
import { getPhraseIndex } from "@/lib/content/loader";

export const metadata: Metadata = {
  title: "Ошибки",
  description: "Все фразы, в которых вы ошибались, с планом повторения.",
  alternates: { canonical: "/learn/mistakes" },
};

export default function MistakesPage() {
  return <MistakesView phrases={getPhraseIndex()} />;
}
