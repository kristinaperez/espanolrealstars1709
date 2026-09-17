"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarClock, RefreshCw, TriangleAlert } from "lucide-react";
import { ExerciseRunner, type SessionResult } from "@/components/trainer/exercise-runner";
import { SessionSummary } from "@/components/trainer/session-summary";
import { Badge, Card, ProgressBar } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProgress } from "@/components/providers/progress-provider";
import { generatePractice, flashcardsFor } from "@/lib/exercises/generator";
import type { Exercise } from "@/lib/exercises/generator";
import type { Distractor, IndexedPhrase } from "@/lib/content/types";
import { isDue, phraseId } from "@/lib/srs";
import { dateKey, formatDateRu } from "@/lib/utils";

function buildSession(phrases: IndexedPhrase[], seed: string): Exercise[] {
  const pool: Distractor[] = phrases.map((phrase) => ({
    spanish: phrase.spanish,
    translation: phrase.translation,
  }));
  const items = phrases.map((phrase) => ({
    phrase: {
      spanish: phrase.spanish,
      translation: phrase.translation,
      example: phrase.example,
      exampleTranslation: phrase.exampleTranslation,
      difficulty: phrase.difficulty,
      tags: phrase.tags,
    },
    index: phrase.index,
    lesson: phrase.lesson,
  }));
  const cards = phrases.flatMap((phrase) => {
    const lesson = {
      lesson: phrase.lesson,
      slug: "",
      title: "",
      category: "",
      milestone: "",
      difficulty: phrase.difficulty ?? "A1",
      tags: [],
      phrases: [
        {
          spanish: phrase.spanish,
          translation: phrase.translation,
          example: phrase.example,
          exampleTranslation: phrase.exampleTranslation,
          difficulty: phrase.difficulty,
          tags: phrase.tags,
        },
      ],
    };
    return flashcardsFor(lesson, true);
  });
  const practice = generatePractice(items, pool, seed);
  return [...cards, ...practice];
}

function Session({
  phrases,
  title,
  subtitle,
  kind,
}: {
  phrases: IndexedPhrase[];
  title: string;
  subtitle: string;
  kind: "review" | "mistakes";
}) {
  const { dispatch } = useProgress();
  const [started, setStarted] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<SessionResult | null>(null);

  const exercises = useMemo(
    () => buildSession(phrases, `${kind}-${attempt}`),
    [attempt, kind, phrases],
  );

  if (started && !result) {
    return (
      <ExerciseRunner
        key={`${kind}-${attempt}`}
        exercises={exercises}
        mode="review"
        title={title}
        subtitle={subtitle}
        onFinish={(payload) => {
          dispatch({ type: "reviewComplete", correct: payload.correct, total: payload.total });
          setResult(payload);
        }}
      />
    );
  }

  if (result) {
    return (
      <SessionSummary
        result={result}
        title={kind === "review" ? "✔ Ежедневное повторение выполнено!" : "Ошибки разобраны!"}
        reviewHref="/learn/review"
        retryHref={kind === "review" ? "/learn/review" : "/learn/mistakes"}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Повторение</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">{subtitle}</p>
      </header>

      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">Карточек в сессии: {phrases.length}</p>
          <Badge tone="primary">+30 XP за сессию</Badge>
        </div>
        <ProgressBar value={Math.min(100, phrases.length * 10)} />
        <ul className="flex max-h-80 flex-col divide-y divide-line overflow-y-auto">
          {phrases.map((phrase) => (
            <li key={`${phrase.lesson}-${phrase.index}`} className="py-3">
              <p className="text-base font-bold">{phrase.spanish}</p>
              <p className="text-sm text-muted">{phrase.translation}</p>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            block
            onClick={() => {
              setAttempt((value) => value + 1);
              setStarted(true);
            }}
          >
            Начать повторение
          </Button>
          <Link
            href="/learn"
            className="inline-flex h-14 items-center justify-center rounded-2xl px-7 text-base font-semibold text-muted hover:text-foreground"
          >
            Позже
          </Link>
        </div>
      </Card>
    </div>
  );
}

export function ReviewView({ phrases }: { phrases: IndexedPhrase[] }) {
  const { state, ready } = useProgress();
  const due = useMemo(
    () =>
      phrases.filter((phrase) => {
        const srs = state.phrases[phraseId(phrase.lesson, phrase.index)];
        return srs ? isDue(srs) : false;
      }),
    [phrases, state.phrases],
  );

  const nextDue = useMemo(() => {
    const dates = Object.values(state.phrases)
      .map((item) => item.due)
      .filter((value): value is string => Boolean(value))
      .sort();
    const today = dateKey();
    return dates.find((value) => value > today) ?? null;
  }, [state.phrases]);

  if (due.length > 0) {
    return (
      <Session
        phrases={due}
        title="Ежедневное повторение"
        subtitle="Фразы, которые вы начали забывать. Метод интервалов: 1 → 3 → 7 → 30 → 90 дней."
        kind="review"
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Повторение</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Всё повторено ✔</h1>
      </header>
      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="text-5xl">🌙</span>
        <p className="text-lg font-bold">Сейчас повторять нечего</p>
        <p className="max-w-md text-sm text-muted">
          {nextDue
            ? `Следующая сессия повторения: ${formatDateRu(nextDue)}. Ошибки возвращаются точно тогда, когда вы начинаете их забывать.`
            : "Ошибки появятся здесь после первых уроков. Каждая ошибка создаёт свой график повторения: 1, 3, 7, 30 и 90 дней."}
        </p>
        <Link
          href="/learn"
          className="mt-2 inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-6 text-[15px] font-semibold text-primary-contrast shadow-[0_4px_0_0_var(--primary-strong)]"
        >
          <RefreshCw className="mr-2 h-5 w-5" /> Продолжить уроки
        </Link>
      </Card>
      <Card>
        <p className="flex items-center gap-2 text-sm font-bold">
          <CalendarClock className="h-4 w-4" /> План повторения
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-5">
          {[1, 3, 7, 30, 90].map((days) => (
            <li key={days} className="rounded-2xl bg-background-soft px-3 py-2 text-center text-sm font-bold">
              +{days} дн.
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export function MistakesView({ phrases }: { phrases: IndexedPhrase[] }) {
  const { state, ready } = useProgress();
  const mistakes = useMemo(
    () =>
      phrases
        .map((phrase) => ({ phrase, srs: state.phrases[phraseId(phrase.lesson, phrase.index)] }))
        .filter((item) => (item.srs?.wrong ?? 0) > 0)
        .sort((a, b) => (b.srs?.wrong ?? 0) - (a.srs?.wrong ?? 0))
        .map((item) => item.phrase),
    [phrases, state.phrases],
  );

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Работа над ошибками</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Мои ошибки</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Здесь собираются все фразы, где вы ошибались. Они же попадают в расписание повторения автоматически.
        </p>
      </header>

      {mistakes.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="text-5xl">✨</span>
          <p className="text-lg font-bold">{ready ? "Ошибок пока нет" : "Загрузка…"}</p>
          <p className="max-w-md text-sm text-muted">
            Начните урок — и все промахи окажутся здесь вместе с планом повторения.
          </p>
        </Card>
      ) : (
        <Session
          phrases={mistakes}
          title={`Ошибки (${mistakes.length})`}
          subtitle="Разберите фразы, в которых ошибались. Правильный ответ двигает их по интервалам повторения."
          kind="mistakes"
        />
      )}
    </div>
  );
}

export function MistakesEmptyState() {
  return (
    <Card className="flex items-center gap-3">
      <TriangleAlert className="h-5 w-5 text-muted" />
      <p className="text-sm text-muted">Ошибок нет — отличная работа!</p>
    </Card>
  );
}
