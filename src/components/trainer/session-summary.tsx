"use client";

import Link from "next/link";
import { useState } from "react";
import { Star } from "lucide-react";
import { Confetti } from "@/components/ui/confetti";
import { Badge, Card, ProgressBar } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProgress } from "@/components/providers/progress-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { TelegramLogin } from "@/components/auth/telegram-login";
import { TelegramStarsPayment } from "@/components/payments/telegram-stars";
import { levelFromXp, levelProgress } from "@/lib/content/config";
import type { SessionResult } from "./exercise-runner";

export function SessionSummary({
  result,
  title,
  nextHref,
  retryHref,
  reviewHref,
}: {
  result: SessionResult;
  title: string;
  nextHref?: string;
  retryHref?: string;
  reviewHref?: string;
}) {
  const { state } = useProgress();
  const score = result.total === 0 ? 0 : Math.round((result.correct / result.total) * 100);
  const beforeLevel = levelFromXp(Math.max(0, state.xp - result.xpGained)).level;
  const currentLevel = levelFromXp(state.xp).level;
  const levelUp = currentLevel > beforeLevel;
  const progress = levelProgress(state.xp);

  const message =
    score === 100
      ? "Идеально! Все ответы верные 🎯"
      : score >= 80
        ? "Отличная работа!"
        : score >= 60
          ? "Хороший результат — продолжай!"
          : "Есть над чем поработать. Ошибки уже в повторении.";

  return (
    <div className="animate-pop rounded-3xl border border-line bg-surface p-6 text-center shadow-[0_8px_36px_rgba(28,21,18,0.08)] sm:p-9">
      <Confetti active={score >= 60} />
      <p className="text-5xl">{score === 100 ? "🏆" : score >= 60 ? "🎉" : "💪"}</p>
      <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h2>
      <p className="mt-1 text-sm text-muted">{message}</p>

      <div className="mx-auto mt-6 grid max-w-lg grid-cols-3 gap-3">
        <Stat label="Верно" value={`${result.correct}`} tone="success" />
        <Stat label="Ошибки" value={`${result.wrong}`} tone="danger" />
        <Stat label="XP" value={`+${result.xpGained}`} tone="accent" />
      </div>

      <div className="mx-auto mt-6 max-w-lg text-left">
        <div className="mb-2 flex items-center justify-between text-sm font-bold">
          <span>
            Уровень {currentLevel} · {levelFromXp(state.xp).name}
          </span>
          <span className="text-muted">{progress.xpToNext} XP до след.</span>
        </div>
        <ProgressBar value={progress.percent} tone="accent" />
        {levelUp ? (
          <p className="mt-3 rounded-2xl bg-accent/25 px-4 py-3 text-sm font-bold">
            🚀 Новый уровень {currentLevel}! {levelFromXp(state.xp).name}
          </p>
        ) : null}
        {state.streak.current > 1 ? (
          <p className="mt-3 text-sm text-muted">
            🔥 Серия: <span className="font-bold text-foreground">{state.streak.current} дн.</span> подряд
          </p>
        ) : null}
      </div>

      {result.mistakes.length > 0 ? (
        <div className="mx-auto mt-6 max-w-lg rounded-3xl border border-line bg-background-soft p-4 text-left">
          <p className="text-sm font-bold">Повторить ошибки ({result.mistakes.length})</p>
          <ul className="mt-2 flex flex-col gap-2">
            {result.mistakes.slice(0, 5).map((exercise) => (
              <li key={exercise.id} className="text-sm">
                <span className="font-semibold">{exercise.phrase.spanish}</span>
                <span className="text-muted"> — {exercise.phrase.translation}</span>
              </li>
            ))}
          </ul>
          {reviewHref ? (
            <Link
              href={reviewHref}
              className="mt-3 inline-flex text-sm font-bold text-primary underline decoration-primary/40"
            >
              Перейти к повторению →
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        {nextHref ? (
          <Link
            href={nextHref}
            className="inline-flex h-14 items-center justify-center rounded-2xl bg-primary px-7 text-base font-semibold text-primary-contrast shadow-[0_4px_0_0_var(--primary-strong)]"
          >
            Следующий урок →
          </Link>
        ) : null}
        {retryHref ? (
          <Link
            href={retryHref}
            className="inline-flex h-14 items-center justify-center rounded-2xl border border-line bg-surface px-7 text-base font-semibold"
          >
            Пройти снова
          </Link>
        ) : null}
        <Link
          href="/learn"
          className="inline-flex h-14 items-center justify-center rounded-2xl px-7 text-base font-semibold text-muted hover:text-foreground"
        >
          На дашборд
        </Link>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "danger" | "accent";
}) {
  const tones = {
    success: "bg-success-soft text-success",
    danger: "bg-danger-soft text-danger",
    accent: "bg-accent/25 text-[#8a5a00] dark:text-accent",
  };
  return (
    <div className={`rounded-2xl px-3 py-4 ${tones[tone]}`}>
      <p className="text-2xl font-extrabold leading-none">{value}</p>
      <p className="mt-1 text-xs font-semibold opacity-80">{label}</p>
    </div>
  );
}

export function PremiumLock({ nextLesson }: { nextLesson?: number }) {
  const { state } = useProgress();
  const { starsPrice, user } = useAuth();
  const [showPayment, setShowPayment] = useState(false);

  return (
    <div className="flex flex-col gap-5 rounded-3xl border-2 border-primary/30 bg-primary/8 p-6 text-center sm:p-10">
      <div>
        <p className="text-5xl">🔒</p>
        <h2 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
          Вы прошли бесплатную часть курса
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base text-muted">
          Откройте все уроки, полную систему повторения, экзамены и сертификат. Разовая оплата{" "}
          <span className="font-bold text-foreground">{starsPrice} ⭐</span> в Telegram — без подписки и
          автоплатежей.
        </p>
      </div>

      <div className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
        {state.license ? (
          <Link
            href="/learn/settings#premium"
            className="inline-flex h-14 items-center justify-center rounded-2xl bg-primary px-7 text-base font-semibold text-primary-contrast shadow-[0_4px_0_0_var(--primary-strong)]"
          >
            Управление доступом
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setShowPayment((value) => !value)}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-7 text-base font-semibold text-primary-contrast shadow-[0_4px_0_0_var(--primary-strong)]"
          >
            <Star className="h-5 w-5" /> Разблокировать за {starsPrice} ⭐
          </button>
        )}
        {nextLesson ? (
          <Link
            href={`/lesson/${nextLesson}`}
            className="inline-flex h-14 items-center justify-center rounded-2xl border border-line bg-surface px-7 text-base font-semibold"
          >
            Посмотреть урок {nextLesson}
          </Link>
        ) : null}
      </div>

      {showPayment && !state.license ? (
        <div className="mx-auto max-w-xl text-left">
          <Card className="bg-surface">
            {user ? (
              <TelegramStarsPayment compact />
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm font-bold">Войдите через Telegram, чтобы оплатить</p>
                <TelegramLogin variant="compact" />
                <Link
                  href="/learn/settings#premium"
                  className="text-xs font-bold text-primary underline decoration-primary/40"
                >
                  У меня есть лицензионный ключ →
                </Link>
              </div>
            )}
          </Card>
        </div>
      ) : null}

      <div className="flex flex-wrap justify-center gap-2">
        <Badge tone="success">Без подписки</Badge>
        <Badge tone="info">Все будущие уроки</Badge>
        <Badge tone="accent">Бессрочный доступ</Badge>
      </div>
    </div>
  );
}
