import type { Metadata } from "next";
import { LessonList } from "@/components/learn/lesson-list";
import { getExamBlocks } from "@/lib/content/loader";

export const metadata: Metadata = {
  title: "Уроки",
  description: "Все уроки курса Español Real: повседневный испанский, жильё, банк, врач, документы, работа и общение.",
  alternates: { canonical: "/learn/lessons" },
};

export default function LessonsPage() {
  const blocks = getExamBlocks().map((block) => ({
    block: block.block,
    fromLesson: block.fromLesson,
    toLesson: block.toLesson,
    phraseCount: block.phraseCount,
  }));
  return <LessonList examBlocks={blocks} />;
}
