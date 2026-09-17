"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { ExerciseRunner, type SessionResult } from "@/components/trainer/exercise-runner";
import { SessionSummary } from "@/components/trainer/session-summary";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Distractor, Lesson } from "@/lib/content/types";
import { flashcardsFor, generatePractice } from "@/lib/exercises/generator";

export function DemoLesson({ lesson, pool }: { lesson: Lesson; pool: Distractor[] }) {
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<SessionResult | null>(null);

  const exercises = useMemo(() => {
    const cards = flashcardsFor(lesson).slice(0, 3);
    const items = lesson.phrases.slice(0, 4).map((phrase, index) => ({ phrase, index, lesson: lesson.lesson }));
    const practice = generatePractice(items, pool, `demo-${lesson.lesson}`).slice(0, 4);
    return [...cards, ...practice];
  }, [lesson, pool]);

  if (started && result) {
    return (
      <SessionSummary
        result={result}
        title="Демо-урок пройден!"
        nextHref="/lesson/1"
        reviewHref="/learn"
      />
    );
  }

  if (started) {
    return (
      <ExerciseRunner
        exercises={exercises}
        mode="lesson"
        title={`Демо · ${lesson.title}`}
        subtitle="Полный доступ без регистрации"
        onFinish={setResult}
      />
    );
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="primary">Урок {lesson.lesson}</Badge>
        <Badge tone="accent">{lesson.difficulty}</Badge>
        <Badge>Бесплатно, без регистрации</Badge>
      </div>
      <h3 className="text-2xl font-extrabold tracking-tight">{lesson.title}</h3>
      <p className="text-sm text-muted">{lesson.summary}</p>
      <ul className="flex flex-col divide-y divide-line">
        {lesson.phrases.slice(0, 3).map((phrase) => (
          <li key={phrase.spanish} className="py-3">
            <p className="text-lg font-bold tracking-tight">{phrase.spanish}</p>
            <p className="text-sm text-muted">{phrase.translation}</p>
          </li>
        ))}
      </ul>
      <Button size="lg" onClick={() => setStarted(true)}>
        <Sparkles className="h-5 w-5" /> Попробовать прямо сейчас
      </Button>
      <p className="text-xs text-muted">
        Внутри: карточки, выбор перевода, вставка слова, сборка фразы, «верно/неверно» и ввод перевода. Прогресс
        сохранится на вашем устройстве.
      </p>
    </Card>
  );
}
