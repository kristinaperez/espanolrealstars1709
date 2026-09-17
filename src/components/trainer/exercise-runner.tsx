"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Heart, Zap } from "lucide-react";
import { FlipCard } from "./flip-card";
import { Badge, ProgressBar } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProgress } from "@/components/providers/progress-provider";
import { comboBonusPercent } from "@/lib/content/config";
import type { Exercise } from "@/lib/exercises/generator";
import { answersMatch } from "@/lib/text";
import { playFeedback } from "@/lib/sound";
import { cn } from "@/lib/utils";

export interface SessionResult {
  correct: number;
  wrong: number;
  total: number;
  xpGained: number;
  mistakes: Exercise[];
}

type Mode = "lesson" | "exam" | "review";

const MODE_LABEL: Record<Mode, string> = {
  lesson: "Урок",
  exam: "Экзамен",
  review: "Повторение",
};

export function ExerciseRunner({
  exercises,
  mode,
  title,
  subtitle,
  nextHref,
  onFinish,
}: {
  exercises: Exercise[];
  mode: Mode;
  title: string;
  subtitle?: string;
  nextHref?: string;
  onFinish: (result: SessionResult) => void;
}) {
  const { state, dispatch } = useProgress();
  const [queue, setQueue] = useState<Exercise[]>(exercises);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [boolAnswer, setBoolAnswer] = useState<boolean | null>(null);
  const [input, setInput] = useState("");
  const [built, setBuilt] = useState<string[]>([]);
  const [result, setResult] = useState<null | "correct" | "wrong">(null);
  const [finished, setFinished] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const startXp = useRef<number | null>(null);
  const firstAttempts = useRef<Record<string, boolean>>({});
  const mistakeIds = useRef<Set<string>>(new Set());
  const scoredRef = useRef(false);

  const total = exercises.length;
  const current = queue[index];
  const showHearts = state.settings.hearts;
  const heartsLeft = state.hearts.count;
  const outOfHearts = showHearts && heartsLeft <= 0;

  useEffect(() => {
    if (startXp.current === null) startXp.current = state.xp;
  }, [state.xp]);

  const reset = useCallback(() => {
    setSelected(null);
    setBoolAnswer(null);
    setInput("");
    setBuilt([]);
    setResult(null);
  }, []);

  const grade = useCallback(
    (correct: boolean, exercise: Exercise) => {
      if (firstAttempts.current[exercise.id] === undefined) {
        firstAttempts.current[exercise.id] = correct;
      }
      if (!correct) mistakeIds.current.add(exercise.id);
      dispatch({ type: "answer", lesson: exercise.lesson, phraseIndex: exercise.phraseIndex, correct });
      if (state.settings.sound) playFeedback(correct ? "correct" : "wrong");
      setResult(correct ? "correct" : "wrong");
    },
    [dispatch, state.settings.sound],
  );

  const submit = useCallback(() => {
    if (!current || result) return;
    switch (current.kind) {
      case "choice":
        if (selected === null) return;
        grade(selected === current.answerIndex, current);
        break;
      case "fill":
        if (selected === null) return;
        grade(selected === current.options.indexOf(current.answer), current);
        break;
      case "truefalse":
        if (boolAnswer === null) return;
        grade(boolAnswer === current.isTrue, current);
        break;
      case "build":
        if (built.length === 0) return;
        grade(answersMatch(built.join(" "), current.answer), current);
        break;
      case "translate":
        if (input.trim().length === 0) return;
        grade(answersMatch(input, current.answer), current);
        break;
      default:
        break;
    }
  }, [boolAnswer, built, current, grade, input, result, selected]);

  const next = useCallback(() => {
    const wasWrong = result === "wrong";
    const currentExercise = current;
    reset();
    if (wasWrong && currentExercise) {
      // Spaced repetition inside the session: mistakes come back at the end.
      setQueue((prev) => [...prev, { ...currentExercise, id: `${currentExercise.id}#r` }]);
    }
    if (index + 1 >= (wasWrong ? queue.length + 1 : queue.length)) {
      setFinished(true);
    } else {
      setIndex((value) => value + 1);
    }
  }, [current, index, queue.length, reset, result]);

  useEffect(() => {
    if (!finished || scoredRef.current) return;
    scoredRef.current = true;
    const attempts = Object.values(firstAttempts.current);
    const correct = attempts.filter(Boolean).length;
    const wrong = attempts.length - correct;
    const gained = state.xp - (startXp.current ?? state.xp);
    setXpGained(gained);
    const mistakes = exercises.filter((exercise) => mistakeIds.current.has(exercise.id));
    if (state.settings.sound) playFeedback("finish");
    onFinish({ correct, wrong, total: attempts.length, xpGained: gained, mistakes });
  }, [finished, exercises, onFinish, state.xp]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        if (result) next();
        else submit();
      }
      if (!result && /^[1-4]$/.test(event.key) && current && (current.kind === "choice" || current.kind === "fill")) {
        const optionIndex = Number(event.key) - 1;
        if (optionIndex < current.options.length) setSelected(optionIndex);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, next, result, submit]);

  const percent = useMemo(() => {
    const done = index + (finished ? 1 : 0);
    return total === 0 ? 0 : Math.round((Math.min(done, total) / total) * 100);
  }, [finished, index, total]);

  if (total === 0) {
    return (
      <div className="rounded-3xl border border-line bg-surface p-8 text-center">
        <p className="text-lg font-bold">Нет упражнений для этой сессии.</p>
        <p className="mt-2 text-sm text-muted">Загляните сюда после того, как пройдёте несколько уроков.</p>
      </div>
    );
  }

  if (finished) return null;

  if (outOfHearts) {
    return (
      <div className="rounded-3xl border border-line bg-surface p-8 text-center">
        <p className="text-3xl">💔</p>
        <h2 className="mt-3 text-xl font-extrabold">Сердечки закончились</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Они восстанавливаются со временем. Вы можете продолжить без сердечек — режим отключается в настройках.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/learn" className="inline-flex h-14 items-center justify-center rounded-2xl border border-line bg-surface px-7 text-base font-semibold">
            Выйти
          </Link>
          <Button size="lg" onClick={() => dispatch({ type: "setSettings", patch: { hearts: false } })}>
            Продолжить без сердечек
          </Button>
        </div>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">{MODE_LABEL[mode]}</p>
            <h1 className="truncate text-lg font-extrabold tracking-tight sm:text-xl">{title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {showHearts ? (
              <span className="flex items-center gap-1 rounded-full bg-danger-soft px-2.5 py-1 text-sm font-bold text-danger">
                <Heart className="h-4 w-4" /> {heartsLeft}
              </span>
            ) : null}
            {state.combo >= 2 ? (
              <span className="flex items-center gap-1 rounded-full bg-accent/25 px-2.5 py-1 text-sm font-bold">
                <Zap className="h-4 w-4" /> x{state.combo}
                {comboBonusPercent(state.combo) > 0 ? ` +${comboBonusPercent(state.combo)}%` : ""}
              </span>
            ) : null}
            <span className="text-sm font-bold text-muted">
              {Math.min(index + 1, total)}/{total}
            </span>
          </div>
        </div>
        <ProgressBar value={percent} />
        {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
      </header>

      <section key={current.id} className="animate-fade-up">
        {(current.kind === "flashcard" || current.kind === "reverse-flashcard") && (
          <div className="flex min-h-[420px] flex-col">
            <FlipCard
              phrase={current.phrase}
              reverse={current.kind === "reverse-flashcard"}
              index={index}
              total={total}
              difficulty={current.phrase.difficulty}
              onKnown={() => {
                dispatch({ type: "flashcard", lesson: current.lesson, phraseIndex: current.phraseIndex, reverse: current.kind === "reverse-flashcard" });
                next();
              }}
            />
          </div>
        )}

        {current.kind === "choice" && (
          <Question
            prompt={current.direction === "es-ru" ? current.phrase.spanish : current.phrase.translation}
            hint={current.direction === "es-ru" ? "Выберите перевод" : "Выберите испанский вариант"}
          >
            {current.options.map((option, optionIndex) => (
              <OptionButton
                key={option}
                label={option}
                index={optionIndex}
                disabled={Boolean(result)}
                selected={selected === optionIndex}
                state={result ? (optionIndex === current.answerIndex ? "correct" : selected === optionIndex ? "wrong" : "idle") : "idle"}
                onClick={() => setSelected(optionIndex)}
              />
            ))}
          </Question>
        )}

        {current.kind === "fill" && (
          <Question prompt={current.sentence} hint="Вставьте пропущенное слово">
            {current.options.map((option, optionIndex) => (
              <OptionButton
                key={`${option}-${optionIndex}`}
                label={option}
                index={optionIndex}
                disabled={Boolean(result)}
                selected={selected === optionIndex}
                state={
                  result
                    ? optionIndex === current.options.indexOf(current.answer)
                      ? "correct"
                      : selected === optionIndex
                        ? "wrong"
                        : "idle"
                    : "idle"
                }
                onClick={() => setSelected(optionIndex)}
              />
            ))}
          </Question>
        )}

        {current.kind === "truefalse" && (
          <Question prompt={current.shown} hint="Верно ли показан перевод?">
            <p className="mb-4 rounded-3xl border-2 border-dashed border-line bg-background-soft px-5 py-4 text-center text-lg font-bold">
              {current.shownTranslation}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={result && current.isTrue ? "success" : "secondary"}
                size="lg"
                disabled={Boolean(result)}
                onClick={() => setBoolAnswer(true)}
              >
                ✔ Верно
              </Button>
              <Button
                variant={result && !current.isTrue ? "success" : "secondary"}
                size="lg"
                disabled={Boolean(result)}
                onClick={() => setBoolAnswer(false)}
              >
                ✘ Неверно
              </Button>
            </div>
          </Question>
        )}

        {current.kind === "build" && (
          <Question prompt={current.phrase.translation} hint="Составьте фразу из слов">
            <div className="mb-4 flex min-h-[72px] flex-wrap items-center gap-2 rounded-3xl border-2 border-dashed border-line bg-background-soft p-3">
              {built.length === 0 ? (
                <span className="px-2 text-sm text-muted">Нажимайте слова ниже…</span>
              ) : (
                built.map((token, tokenIndex) => (
                  <button
                    key={`${token}-${tokenIndex}`}
                    type="button"
                    disabled={Boolean(result)}
                    onClick={() => {
                      setBuilt((prev) => prev.filter((_, i) => i !== tokenIndex));
                    }}
                    className="rounded-2xl bg-primary px-4 py-2 text-base font-bold text-primary-contrast shadow-[0_3px_0_0_var(--primary-strong)]"
                  >
                    {token}
                  </button>
                ))
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {current.tokens.map((token, tokenIndex) => {
                const used = built.filter((item) => item === token).length;
                const available = current.tokens.filter((item) => item === token).length;
                const disabled = used >= available || Boolean(result);
                return (
                  <button
                    key={`${token}-${tokenIndex}`}
                    type="button"
                    disabled={disabled}
                    onClick={() => setBuilt((prev) => [...prev, token])}
                    className="rounded-2xl border border-line bg-surface px-4 py-2 text-base font-semibold shadow-[0_3px_0_0_var(--border)] disabled:opacity-30"
                  >
                    {token}
                  </button>
                );
              })}
            </div>
          </Question>
        )}

        {current.kind === "translate" && (
          <Question prompt={current.phrase.translation} hint="Напишите по-испански">
            <input
              id="translation-answer"
              name="translation-answer"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={Boolean(result)}
              placeholder="Escribe en español…"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className="h-16 w-full rounded-3xl border-2 border-line bg-surface px-5 text-xl font-bold tracking-tight outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
            />
            {!result ? <p className="mt-2 text-xs text-muted">Подсказка: {current.hint}</p> : null}
          </Question>
        )}
      </section>

      {result && current.gradable ? (
        <footer
          className={cn(
            "animate-pop rounded-3xl border-2 p-5",
            result === "correct" ? "border-success/40 bg-success-soft" : "border-danger/40 bg-danger-soft",
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className={cn("text-lg font-extrabold", result === "correct" ? "text-success" : "text-danger")}>
                {result === "correct" ? "¡Muy bien! ✔" : "Почти ✘"}
              </p>
              <p className="mt-1 text-sm font-semibold">
                {current.kind === "build" || current.kind === "translate"
                  ? current.answer
                  : current.phrase.spanish}{" "}
                — {current.phrase.translation}
              </p>
              {current.phrase.notes ? (
                <p className="mt-1 text-sm text-muted">{current.phrase.notes}</p>
              ) : null}
              {current.phrase.example ? (
                <p className="mt-2 text-sm text-muted">
                  <span className="font-semibold text-foreground">{current.phrase.example}</span>
                  {current.phrase.exampleTranslation ? ` — ${current.phrase.exampleTranslation}` : ""}
                </p>
              ) : null}
            </div>
            {result === "wrong" ? <Badge tone="danger">добавлено в повторение</Badge> : null}
          </div>
        </footer>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {result ? (
          <Button size="lg" variant={result === "correct" ? "success" : "primary"} onClick={next} block>
            Продолжить →
          </Button>
        ) : (
          <Button size="lg" onClick={submit} block disabled={current.kind === "choice" || current.kind === "fill" ? selected === null : current.kind === "truefalse" ? boolAnswer === null : current.kind === "build" ? built.length === 0 : input.trim().length === 0}>
            Проверить
          </Button>
        )}
        {nextHref ? null : null}
      </div>
    </div>
  );
}

function Question({
  prompt,
  hint,
  children,
}: {
  prompt: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-line bg-surface p-5 shadow-[0_4px_24px_rgba(28,21,18,0.06)] sm:p-7">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">{hint}</p>
      <p className="mt-3 text-2xl font-extrabold leading-snug tracking-tight sm:text-3xl">{prompt}</p>
      <div className="mt-6 flex flex-col gap-3">{children}</div>
    </div>
  );
}

function OptionButton({
  label,
  index,
  selected,
  state,
  disabled,
  onClick,
}: {
  label: string;
  index: number;
  selected: boolean;
  state: "idle" | "correct" | "wrong";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left text-base font-semibold transition",
        state === "correct" && "border-success bg-success-soft text-success",
        state === "wrong" && "animate-shake border-danger bg-danger-soft text-danger",
        state === "idle" && selected && "border-primary bg-primary/10",
        state === "idle" && !selected && "border-line bg-surface hover:border-primary/50 hover:bg-background-soft",
      )}
    >
      <span
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm font-bold",
          selected || state !== "idle" ? "bg-primary text-primary-contrast" : "bg-background-soft text-muted",
        )}
      >
        {index + 1}
      </span>
      <span className="leading-snug">{label}</span>
    </button>
  );
}
