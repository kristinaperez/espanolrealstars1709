"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Flame, Trophy, Zap } from "lucide-react";
import { Badge, Card, ProgressBar } from "@/components/ui/card";
import { useProgress, useStats } from "@/components/providers/progress-provider";
import { milestoneProgress } from "@/lib/progress/reducer";
import { achievementsConfig, categoryById } from "@/lib/content/config";
import { calendarDays } from "@/lib/progress/selectors";
import { cn, monthLabel } from "@/lib/utils";

export function StatsView() {
  const { state, ready, metas } = useProgress();
  const stats = useStats();
  const milestones = milestoneProgress(state, metas);
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const cells = calendarDays(state, cursor.year, cursor.month);

  const move = (delta: number) => {
    setCursor((prev) => {
      const date = new Date(prev.year, prev.month + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Статистика</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Ваши результаты</h1>
        <p className="mt-2 text-sm text-muted">
          Уровень {stats.level} · {stats.levelName} · {stats.xp} XP · до следующего уровня {stats.xpToNext} XP
        </p>
        <ProgressBar value={stats.levelPercent} tone="accent" className="mt-3" />
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Metric label="Уроков пройдено" value={`${stats.lessonsCompleted}/${stats.lessonsTotal}`} />
        <Metric label="Фраз изучено" value={`${stats.phrasesLearned}`} />
        <Metric label="Освоено надёжно" value={`${stats.phrasesMastered}`} />
        <Metric label="Точность" value={`${stats.accuracy}%`} />
        <Metric label="Правильных ответов" value={`${stats.correct}`} tone="success" />
        <Metric label="Ошибок" value={`${stats.wrong}`} tone="danger" />
        <Metric label="XP" value={`${stats.xp}`} tone="accent" />
        <Metric label="Дней с занятиями" value={`${stats.studiedDays}`} />
        <Metric label="Серия" value={`🔥 ${stats.streak}`} />
        <Metric label="Рекорд серии" value={`${stats.longestStreak}`} />
        <Metric label="Лучшее комбо" value={`x${stats.bestCombo}`} />
        <Metric label="Экзаменов" value={`${stats.examsPassed}`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">Календарь занятий</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => move(-1)}
                aria-label="Предыдущий месяц"
                className="grid h-8 w-8 place-items-center rounded-xl border border-line"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-36 text-center text-sm font-bold">{monthLabel(cursor.year, cursor.month)}</span>
              <button
                type="button"
                onClick={() => move(1)}
                aria-label="Следующий месяц"
                className="grid h-8 w-8 place-items-center rounded-xl border border-line"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold text-muted">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
              <span key={day}>{day}</span>
            ))}
            {cells.map((cell, index) =>
              cell === null ? (
                <span key={`empty-${index}`} />
              ) : (
                <span
                  key={cell.key}
                  title={`${cell.key}: ${cell.xp} XP`}
                  className={cn(
                    "grid aspect-square place-items-center rounded-xl border text-xs font-bold",
                    cell.studied
                      ? "border-success/40 bg-success/25 text-success"
                      : "border-line bg-background-soft text-muted/60",
                    cell.isToday && "ring-2 ring-primary ring-offset-2 ring-offset-surface",
                  )}
                >
                  {cell.day}
                </span>
              ),
            )}
          </div>
          <p className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-success/50" /> занимались
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-background-soft" /> пропуск
            </span>
          </p>
        </Card>

        <Card>
          <p className="text-sm font-bold">Прогресс по темам</p>
          <ul className="mt-3 flex flex-col gap-2">
            {Array.from(categoryById.values()).map((category) => {
              const lessons = metas.filter((meta) => meta.category === category.id);
              if (lessons.length === 0) return null;
              const done = lessons.filter((meta) => state.lessons[String(meta.lesson)]?.completed).length;
              return (
                <li key={category.id} className="flex items-center gap-3">
                  <span className="w-8 shrink-0 text-lg">{category.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between text-sm font-semibold">
                      <span className="truncate">{category.labelRu}</span>
                      <span className="text-xs text-muted">
                        {done}/{lessons.length}
                      </span>
                    </span>
                    <ProgressBar value={(done / lessons.length) * 100} className="mt-1 h-2" />
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">Карта адаптации</p>
          <Badge tone="primary">
            {stats.milestonesCompleted}/{stats.milestonesTotal}
          </Badge>
        </div>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {milestones.map((milestone) => (
            <li key={milestone.id} className="flex items-center gap-3 rounded-2xl bg-background-soft p-3">
              <span className="text-2xl">{milestone.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{milestone.title}</span>
                <ProgressBar value={milestone.percent} className="mt-1 h-2" tone={milestone.completed ? "success" : "primary"} />
              </span>
              <span className="text-xs font-bold text-muted">{milestone.percent}%</span>
            </li>
          ))}
        </ul>
        <Link href="/learn/map" className="mt-4 inline-flex text-sm font-bold text-primary underline decoration-primary/40">
          Открыть карту →
        </Link>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">Достижения</p>
          <Badge>
            {stats.achievementsUnlocked}/{achievementsConfig.length}
          </Badge>
        </div>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {achievementsConfig.map((achievement) => {
            const unlockedAt = state.achievements[achievement.id];
            return (
              <li
                key={achievement.id}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border p-3",
                  unlockedAt ? "border-accent/50 bg-accent/12" : "border-line bg-background-soft opacity-70",
                )}
              >
                <span className="text-2xl">{unlockedAt ? achievement.emoji : "🔒"}</span>
                <span>
                  <span className="block text-sm font-bold">{achievement.title}</span>
                  <span className="block text-xs text-muted">{achievement.description}</span>
                  {unlockedAt ? <span className="mt-1 block text-[11px] font-bold text-success">{unlockedAt}</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      {!ready ? <p className="text-xs text-muted">Загрузка локального прогресса…</p> : null}

      <div className="flex flex-wrap gap-3">
        <span className="flex items-center gap-2 rounded-2xl bg-background-soft px-4 py-2 text-sm font-bold">
          <Flame className="h-4 w-4 text-primary" /> Серия {stats.streak} дн.
        </span>
        <span className="flex items-center gap-2 rounded-2xl bg-background-soft px-4 py-2 text-sm font-bold">
          <Zap className="h-4 w-4 text-primary" /> {stats.todayXp}/{stats.todayGoal} XP сегодня
        </span>
        <span className="flex items-center gap-2 rounded-2xl bg-background-soft px-4 py-2 text-sm font-bold">
          <Trophy className="h-4 w-4 text-primary" /> {stats.coursePercent}% курса
        </span>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" | "accent" }) {
  const tones = {
    success: "text-success",
    danger: "text-danger",
    accent: "text-[#8a5a00] dark:text-accent",
  };
  return (
    <div className="rounded-3xl border border-line bg-surface p-4">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className={cn("mt-1 text-2xl font-extrabold", tone ? tones[tone] : undefined)}>{value}</p>
    </div>
  );
}
