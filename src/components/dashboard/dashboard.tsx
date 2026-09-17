"use client";

import Link from "next/link";
import { Flame, Repeat, Sparkles, Trophy, Zap } from "lucide-react";
import { Badge, Card, ProgressBar } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProgress, useStats } from "@/components/providers/progress-provider";
import { milestoneProgress } from "@/lib/progress/reducer";
import { achievementsConfig, categoryById } from "@/lib/content/config";
import { addDays, dateKey, daysBetween } from "@/lib/utils";

export function Dashboard() {
  const { state, ready, metas, access } = useProgress();
  const stats = useStats();
  const milestones = milestoneProgress(state, metas);

  const nextLessonMeta = metas.find((meta) => !state.lessons[String(meta.lesson)]?.completed);
  const nextHref = nextLessonMeta
    ? access(nextLessonMeta.lesson)
      ? `/lesson/${nextLessonMeta.lesson}`
      : "/learn/settings#premium"
    : "/certificate";
  const currentMilestone = milestones.find((item) => !item.completed) ?? milestones[milestones.length - 1];
  const lastAchievements = Object.entries(state.achievements).slice(-3).reverse();

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Ваш прогресс</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
            {state.settings.studentName ? `¡Hola, ${state.settings.studentName}!` : "¡Hola! 👋"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Уровень {stats.level} · {stats.levelName} · {stats.xp} XP
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile icon={<Flame className="h-5 w-5" />} value={ready ? `${stats.streak}` : "—"} label="дней подряд" tone="accent" />
          <Tile icon={<Zap className="h-5 w-5" />} value={ready ? `${stats.xp}` : "—"} label="XP" tone="primary" />
          <Tile icon={<Trophy className="h-5 w-5" />} value={ready ? `${stats.lessonsCompleted}` : "—"} label={`из ${stats.lessonsTotal} уроков`} tone="success" />
          <Tile icon={<Sparkles className="h-5 w-5" />} value={ready ? `${stats.phrasesLearned}` : "—"} label="фраз изучено" tone="info" />
        </div>
      </header>

      <Card className="border-primary/25 bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Продолжить обучение</p>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">
              {nextLessonMeta
                ? `Урок ${nextLessonMeta.lesson}. ${nextLessonMeta.title}`
                : "Курс пройден! 🎉"}
            </h2>
            <p className="mt-1 line-clamp-2 text-sm text-muted">
              {nextLessonMeta?.summary ?? "Заберите сертификат о прохождении курса."}
            </p>
          </div>
          <Link
            href={nextHref}
            className="inline-flex h-14 shrink-0 items-center justify-center rounded-2xl bg-primary px-7 text-base font-semibold text-primary-contrast shadow-[0_4px_0_0_var(--primary-strong)]"
          >
            Продолжить →
          </Link>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">Прогресс курса</p>
            <Badge tone="primary">{stats.coursePercent}%</Badge>
          </div>
          <ProgressBar value={stats.coursePercent} className="mt-3" />
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Row label="Уроков пройдено" value={`${stats.lessonsCompleted}/${stats.lessonsTotal}`} />
            <Row label="Экзаменов сдано" value={`${stats.examsPassed}`} />
            <Row label="Фраз изучено" value={`${stats.phrasesLearned}/${stats.phrasesTotal}`} />
            <Row label="Освоено надёжно" value={`${stats.phrasesMastered}`} />
          </dl>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">Цель на сегодня</p>
            <Badge tone={stats.todayXp >= stats.todayGoal ? "success" : "accent"}>
              {stats.todayXp}/{stats.todayGoal} XP
            </Badge>
          </div>
          <ProgressBar value={(stats.todayXp / Math.max(1, stats.todayGoal)) * 100} tone="accent" className="mt-3" />
          <p className="mt-3 text-sm text-muted">
            {stats.todayXp >= stats.todayGoal
              ? "✔ Цель дня выполнена! Так держать."
              : `Осталось ${Math.max(0, stats.todayGoal - stats.todayXp)} XP — это примерно ${Math.max(
                  1,
                  Math.ceil((stats.todayGoal - stats.todayXp) / 5),
                )} упражнений.`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[10, 25, 50, 100].map((goal) => (
              <button
                key={goal}
                type="button"
                onClick={() => window.location.assign("/learn/settings#goal")}
                className="rounded-full border border-line px-3 py-1 text-xs font-bold text-muted hover:border-primary hover:text-primary"
              >
                {goal} XP
              </button>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">Повторение</p>
            <Badge tone={stats.mistakesWaiting > 0 ? "danger" : "success"}>
              {stats.mistakesWaiting > 0 ? `${stats.mistakesWaiting} к повторению` : "всё повторено"}
            </Badge>
          </div>
          <p className="flex items-center gap-2 text-sm text-muted">
            <Repeat className="h-4 w-4" />
            {stats.mistakesWaiting > 0
              ? "Есть фразы, которые пора освежить — это часть метода."
              : "Новых карточек нет. Ошибки появятся по расписанию."}
          </p>
          <Link
            href="/learn/review"
            className="mt-auto inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-5 text-[15px] font-semibold text-primary-contrast shadow-[0_4px_0_0_var(--primary-strong)]"
          >
            {stats.mistakesWaiting > 0 ? `Повторить ${stats.mistakesWaiting}` : "Открыть повторение"}
          </Link>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">Карта адаптации</p>
            <Badge tone="primary">
              {stats.milestonesCompleted}/{stats.milestonesTotal}
            </Badge>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-3xl">{currentMilestone.emoji}</span>
            <div className="min-w-0">
              <p className="truncate text-base font-bold">{currentMilestone.title}</p>
              <p className="text-xs text-muted">
                {currentMilestone.completedCount}/{currentMilestone.totalCount} уроков
              </p>
            </div>
          </div>
          <ProgressBar value={currentMilestone.percent} className="mt-3" />
          <Link
            href="/learn/map"
            className="mt-4 inline-flex text-sm font-bold text-primary underline decoration-primary/40"
          >
            Открыть карту адаптации →
          </Link>
        </Card>
      </div>

      <Card>
        <p className="text-sm font-bold">Календарь занятий</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Array.from({ length: 28 }, (_, i) => 27 - i).map((offset) => {
            const key = addDays(dateKey(), -offset);
            const log = state.days[key];
            const studied = Boolean(log && log.xp > 0);
            return (
              <span
                key={key}
                title={`${key}: ${log?.xp ?? 0} XP`}
                className={`h-7 w-7 rounded-lg border text-center text-[10px] font-bold leading-7 ${
                  studied
                    ? "border-success/40 bg-success/25 text-success"
                    : "border-line bg-background-soft text-muted/60"
                }`}
              >
                {studied ? "•" : ""}
              </span>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted">
          Зелёный — день с занятиями. Пропуск дня сбрасывает серию: сейчас{" "}
          <span className="font-bold text-foreground">{stats.streak} дн.</span>, рекорд {stats.longestStreak} дн.
          {state.streak.lastActive
            ? ` Последнее занятие: ${daysBetween(state.streak.lastActive, dateKey()) === 0 ? "сегодня" : state.streak.lastActive}`
            : ""}
        </p>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">Достижения</p>
          <Badge>
            {stats.achievementsUnlocked}/{achievementsConfig.length}
          </Badge>
        </div>
        {lastAchievements.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Пройдите первый урок, чтобы открыть первое достижение 🎯
          </p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {lastAchievements.map(([id, date]) => {
              const achievement = achievementsConfig.find((item) => item.id === id);
              if (!achievement) return null;
              return (
                <li
                  key={id}
                  className="flex items-center gap-2 rounded-2xl border border-line bg-background-soft px-3 py-2"
                >
                  <span className="text-xl">{achievement.emoji}</span>
                  <span className="text-sm font-bold">{achievement.title}</span>
                  <span className="text-xs text-muted">{date}</span>
                </li>
              );
            })}
          </ul>
        )}
        <Link
          href="/learn/stats"
          className="mt-4 inline-flex text-sm font-bold text-primary underline decoration-primary/40"
        >
          Вся статистика →
        </Link>
      </Card>

      <NextExamCard />
    </div>
  );
}

function NextExamCard() {
  const { state, metas } = useProgress();
  const examEvery = 5;
  const completed = metas.filter((meta) => state.lessons[String(meta.lesson)]?.completed).length;
  const nextBlock = Math.floor(completed / examEvery) + 1;
  const readyForExam = completed > 0 && completed % examEvery === 0 && !state.exams[String(nextBlock)];
  const progressToExam = completed % examEvery;

  return (
    <Card className={readyForExam ? "border-accent/60 bg-accent/12" : undefined}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold">Экзамен {nextBlock}</p>
          <p className="mt-1 text-sm text-muted">
            {readyForExam
              ? "Вы готовы! Экзамен проверит фразы последних 5 уроков."
              : `До экзамена ${examEvery - progressToExam} урок(ов).`}
          </p>
        </div>
        {readyForExam ? (
          <Link
            href={`/exam/${nextBlock}`}
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-2xl bg-accent px-5 text-[15px] font-bold text-[#1c1512] shadow-[0_4px_0_0_rgba(255,170,0,0.7)]"
          >
            Сдать экзамен
          </Link>
        ) : (
          <Badge>{progressToExam}/{examEvery} уроков</Badge>
        )}
      </div>
    </Card>
  );
}

function Tile({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  tone: "primary" | "accent" | "success" | "info";
}) {
  const tones = {
    primary: "text-primary bg-primary/10",
    accent: "text-[#8a5a00] dark:text-accent bg-accent/20",
    success: "text-success bg-success/12",
    info: "text-info bg-info/12",
  };
  return (
    <div className="flex items-center gap-3 rounded-3xl border border-line bg-surface p-3.5">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${tones[tone]}`}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-xl font-extrabold leading-none">{value}</span>
        <span className="block truncate text-[11px] font-semibold text-muted">{label}</span>
      </span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-background-soft px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm font-bold">{value}</dd>
    </div>
  );
}

export function CategoryBadges({ ids }: { ids: string[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {ids.map((id) => {
        const category = categoryById.get(id);
        return category ? (
          <Badge key={id}>
            {category.emoji} {category.labelRu}
          </Badge>
        ) : null;
      })}
    </span>
  );
}
