"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, GraduationCap, Loader2, Sparkles } from "lucide-react";
import { ExerciseRunner, type SessionResult } from "./exercise-runner";
import { PremiumLock, SessionSummary } from "./session-summary";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { useProgress } from "@/components/providers/progress-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { categoryById, course } from "@/lib/content/config";
import type { Distractor, Lesson } from "@/lib/content/types";
import { buildExamSession, buildLessonSession } from "@/lib/exercises/generator";

type Phase = "intro" | "run" | "done";

interface LessonPayload {
  lesson: Lesson;
  pool: Distractor[];
}

/**
 * Trainer shell. Shared by lessons, exams and the landing demo.
 *
 * `protectedContent` means the server withheld the premium phrases: they are
 * fetched from `/api/lessons/[n]` only after an entitlement is confirmed
 * (locally activated license key or a Telegram account with a paid order).
 */
export function TrainerPage({
  mode,
  lessons,
  pool,
  nextHref,
  reviewHref,
  blockNumber,
  protectedContent = false,
}: {
  mode: "lesson" | "exam";
  lessons: Lesson[];
  pool: Distractor[];
  nextHref?: string;
  reviewHref?: string;
  blockNumber?: number;
  protectedContent?: boolean;
}) {
  const { state, dispatch, access } = useProgress();
  const { user, serverPremium } = useAuth();
  const [phase, setPhase] = useState<Phase>("intro");
  const [result, setResult] = useState<SessionResult | null>(null);
  const [attempt, setAttempt] = useState(0);

  const [payloads, setPayloads] = useState<LessonPayload[] | null>(
    protectedContent ? null : lessons.map((lesson) => ({ lesson, pool })),
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  const primary = lessons[0];
  const accessLesson = mode === "exam" ? lessons[lessons.length - 1].lesson : primary.lesson;
  // Either a locally activated key or a Telegram account with a paid order.
  // Deliberately independent of hydration state so SSR and the first client
  // render agree: locked lessons never leak their phrases.
  const entitled = access(accessLesson) || serverPremium;
  const locked = !entitled;

  const licenseKey = state.license?.key ?? "";

  const loadProtected = useCallback(async () => {
    if (!protectedContent || payloads || locked) return;
    setLoadError(null);
    const key = licenseKey ? `?key=${encodeURIComponent(licenseKey)}` : "";
    const responses = await Promise.all(
      lessons.map(async (lesson) => {
        try {
          const response = await fetch(`/api/lessons/${lesson.lesson}${key}`, {
            cache: "no-store",
            credentials: "same-origin",
          });
          if (!response.ok) return null;
          return (await response.json()) as LessonPayload;
        } catch {
          return null;
        }
      }),
    );
    if (responses.some((item) => !item)) {
      setLoadError(
        "Не удалось загрузить урок. Проверьте подключение к интернету или войдите через Telegram, чтобы восстановить покупку.",
      );
      return;
    }
    setPayloads(responses as LessonPayload[]);
  }, [lessons, licenseKey, locked, payloads, protectedContent]);

  useEffect(() => {
    if (!protectedContent || locked) return;
    if (payloads) return;
    // Wait for the local license to be restored from localStorage first.
    if (typeof window === "undefined") return;
    void loadProtected();
  }, [loadProtected, locked, payloads, protectedContent]);

  const activeLessons = useMemo(
    () => (payloads ? payloads.map((item) => item.lesson) : lessons),
    [lessons, payloads],
  );
  const activePool = useMemo(
    () =>
      payloads && payloads.length > 0 && payloads[0].pool.length > 0
        ? payloads[0].pool
        : pool,
    [payloads, pool],
  );

  const session = useMemo(() => {
    if (mode === "exam") {
      return buildExamSession(activeLessons, activePool, `exam-${blockNumber}-${attempt}`, course.examQuestionCount);
    }
    return buildLessonSession(activeLessons[0], activePool, String(attempt));
  }, [attempt, activeLessons, activePool, blockNumber, mode]);

  const progress = state.lessons[String(primary.lesson)];
  const category = categoryById.get(primary.category);

  const finish = (payload: SessionResult) => {
    if (mode === "exam" && blockNumber) {
      dispatch({ type: "examComplete", block: blockNumber, correct: payload.correct, total: payload.total });
    } else {
      dispatch({ type: "lessonComplete", lesson: primary.lesson, correct: payload.correct, total: payload.total });
    }
    setResult(payload);
    setPhase("done");
  };

  if (locked) {
    return <PremiumLock />;
  }

  if (protectedContent && !payloads) {
    return (
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          {loadError ? (
            <>
              <span className="text-4xl">📡</span>
              <p className="text-lg font-bold">Урок не загрузился</p>
              <p className="max-w-md text-sm text-muted">{loadError}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                <Button size="lg" onClick={() => void loadProtected()}>
                  Попробовать снова
                </Button>
                <Link
                  href="/learn/settings#premium"
                  className="inline-flex h-14 items-center justify-center rounded-2xl border border-line bg-surface px-7 text-base font-semibold"
                >
                  Восстановить покупку
                </Link>
              </div>
            </>
          ) : (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-base font-bold">Загружаем урок…</p>
              <p className="text-sm text-muted">Premium-контент подгружается после проверки доступа.</p>
            </>
          )}
        </Card>
      </div>
    );
  }

  if (phase === "run") {
    return (
      <ExerciseRunner
        key={`${mode}-${attempt}`}
        exercises={session.exercises}
        mode={mode}
        title={mode === "exam" ? `Экзамен ${blockNumber}` : primary.title}
        subtitle={mode === "exam" ? "Проверка знаний по блоку уроков" : primary.subtitle}
        onFinish={finish}
      />
    );
  }

  if (phase === "done" && result) {
    return (
      <SessionSummary
        result={result}
        title={mode === "exam" ? "Экзамен сдан!" : "Урок пройден!"}
        nextHref={nextHref}
        retryHref={mode === "lesson" ? `/lesson/${primary.lesson}` : blockNumber ? `/exam/${blockNumber}` : undefined}
        reviewHref="/learn/review"
      />
    );
  }

  const fullLesson = activeLessons[0];

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">
            {mode === "exam" ? `Экзамен ${blockNumber}` : `Урок ${primary.lesson}`}
          </Badge>
          <Badge>
            {category?.emoji} {category?.labelRu ?? primary.category}
          </Badge>
          <Badge tone="accent">{primary.difficulty}</Badge>
          <Badge>{fullLesson.phrases.length} фраз</Badge>
          {progress?.completed ? <Badge tone="success">✓ пройден</Badge> : null}
          {serverPremium || user ? <Badge tone="info">Premium</Badge> : null}
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{primary.title}</h1>
        {primary.subtitle ? <p className="text-base text-muted">{primary.subtitle}</p> : null}
        {primary.summary ? <p className="max-w-2xl text-base">{primary.summary}</p> : null}
      </header>

      {fullLesson.authorComment ? (
        <Card className="border-primary/30 bg-primary/8">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
            <Sparkles className="h-4 w-4" /> Комментарий автора
          </p>
          <p className="mt-2 text-[15px] font-medium leading-relaxed">{fullLesson.authorComment}</p>
        </Card>
      ) : null}

      <Card>
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
          <BookOpen className="h-4 w-4" /> Фразы урока
        </p>
        <ul className="mt-4 flex flex-col divide-y divide-line">
          {fullLesson.phrases.map((phrase) => (
            <li key={phrase.spanish} className="py-3">
              <p className="text-lg font-bold tracking-tight">{phrase.spanish}</p>
              <p className="text-sm text-muted">{phrase.translation}</p>
              {phrase.example ? (
                <p className="mt-1 text-sm text-muted">
                  <span className="font-semibold text-foreground">{phrase.example}</span>
                  {phrase.exampleTranslation ? ` — ${phrase.exampleTranslation}` : ""}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
        {mode === "exam" ? (
          <p className="mt-4 text-sm text-muted">
            В экзамен входят фразы из уроков {activeLessons.map((item) => item.lesson).join(", ")}.
          </p>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-base font-bold">
            {mode === "exam" ? `${course.examQuestionCount} вопросов` : "Карточки · практика · мини-тест"}
          </p>
          <p className="text-sm text-muted">Ошибки автоматически попадают в план повторения.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              setAttempt((value) => value + 1);
              setPhase("run");
            }}
          >
            <GraduationCap className="h-5 w-5" /> Ещё раз
          </Button>
          <Button size="lg" onClick={() => setPhase("run")}>
            Начать <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </Card>

      {nextHref ? (
        <p className="text-sm text-muted">
          Дальше:{" "}
          <Link href={nextHref} className="font-bold text-primary underline decoration-primary/40">
            следующий урок
          </Link>{" "}
          ·{" "}
          <Link href={reviewHref ?? "/learn/review"} className="font-bold text-primary underline decoration-primary/40">
            повторение
          </Link>
        </p>
      ) : null}
    </div>
  );
}
