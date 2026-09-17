import type { Metadata } from "next";
import { SearchView } from "@/components/learn/search-view";
import { getPhraseIndex } from "@/lib/content/loader";

export const metadata: Metadata = {
  title: "Поиск фраз",
  description: "Поиск по всем фразам курса: испанский, русский, теги, уроки и ситуации.",
  alternates: { canonical: "/learn/search" },
};

export default function SearchPage() {
  return <SearchView phrases={getPhraseIndex()} />;
}
