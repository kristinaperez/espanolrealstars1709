import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { TrainerPage } from "@/components/trainer/trainer-page";
import {
  getAdjacent,
  getExamBlockForLesson,
  getLesson,
  getLessonMetas,
  getLessonNumbers,
} from "@/lib/content/loader";
import { categoryById } from "@/lib/content/config";
import { poolForLesson, protectLesson } from "@/lib/content/secure";

export const dynamicParams = false;

export function generateStaticParams() {
  return getLessonNumbers().map((lesson) => ({ n: String(lesson) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ n: string }>;
}): Promise<Metadata> {
  const { n } = await params;
  const lesson = getLesson(Number(n));
  if (!lesson) return { title: "Урок не найден" };
  const category = categoryById.get(lesson.category);
  const description = `${lesson.summary ?? lesson.subtitle} · ${lesson.phrases.length} живых фраз уровня ${lesson.difficulty} с переводом и примерами.`;
  return {
    title: `Урок ${lesson.lesson}. ${lesson.title}`,
    description,
    alternates: { canonical: `/lesson/${lesson.lesson}` },
    openGraph: {
      title: `Урок ${lesson.lesson}. ${lesson.title}`,
      description,
      url: `/lesson/${lesson.lesson}`,
      type: "article",
    },
    keywords: [lesson.title, category?.labelRu ?? "", ...lesson.tags],
  };
}

export default async function LessonPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const number = Number(n);
  const source = getLesson(number);
  if (!source) notFound();

  // Premium phrases never reach the browser: they are fetched from
  // /api/lessons/[n] once an entitlement is confirmed.
  const { lesson, trimmed } = protectLesson(source);
  const pool = poolForLesson(lesson, trimmed);

  const { next } = getAdjacent(number);
  const exam = getExamBlockForLesson(number);
  const metas = getLessonMetas();
  const examReady = exam ? number >= exam.toLesson && metas.length >= exam.toLesson : false;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: `Урок ${lesson.lesson}. ${lesson.title}`,
    description: lesson.summary,
    inLanguage: "es-RU",
    teaches: lesson.phrases.slice(0, 3).map((phrase) => phrase.spanish),
    educationalLevel: lesson.difficulty,
    isAccessibleForFree: !trimmed,
    hasCourseInstance: { "@type": "CourseInstance", courseMode: "online" },
    isPartOf: { "@type": "Course", name: "Español Real" },
  };

  return (
    <AppShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TrainerPage
        mode="lesson"
        lessons={[lesson]}
        pool={pool}
        protectedContent={trimmed}
        nextHref={examReady && exam ? `/exam/${exam.block}` : next ? `/lesson/${next.lesson}` : undefined}
      />
    </AppShell>
  );
}
