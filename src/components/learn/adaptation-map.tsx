"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Badge, Card, ProgressBar } from "@/components/ui/card";
import { useProgress } from "@/components/providers/progress-provider";
import { milestoneProgress } from "@/lib/progress/reducer";
import { categoryById } from "@/lib/content/config";
import { cn } from "@/lib/utils";

export function AdaptationMap() {
  const { state, metas, access } = useProgress();
  const milestones = milestoneProgress(state, metas);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Карта адаптации</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Ваш путь в Испанию 🇪🇸</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Курс измеряет не «уровни языка», а реальные жизненные шаги. Каждый этап открывается, когда пройдены
          соответствующие уроки учебника.
        </p>
      </header>

      <ol className="relative flex flex-col gap-4">
        <span aria-hidden className="absolute left-[27px] top-4 bottom-4 hidden w-0.5 bg-line sm:block" />
        {milestones.map((milestone, index) => {
          const done = milestone.completed;
          const current = !done && index === milestones.findIndex((item) => !item.completed);
          return (
            <li key={milestone.id} className="relative">
              <Card
                className={cn(
                  "sm:ml-16",
                  done && "border-success/40 bg-success/8",
                  current && "border-primary/45 bg-primary/8",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute -left-16 top-6 hidden h-14 w-14 place-items-center rounded-full border-4 border-surface text-2xl sm:grid",
                    done ? "bg-success/25" : current ? "bg-primary/20" : "bg-background-soft",
                  )}
                >
                  {milestone.emoji}
                </span>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                      Этап {index + 1} из {milestones.length}
                    </p>
                    <h2 className="mt-1 text-xl font-extrabold tracking-tight">{milestone.title}</h2>
                    <p className="mt-1 max-w-xl text-sm text-muted">{milestone.description}</p>
                  </div>
                  <Badge tone={done ? "success" : current ? "primary" : "neutral"}>
                    {done ? "✓ пройден" : `${milestone.completedCount}/${milestone.totalCount}`}
                  </Badge>
                </div>
                <ProgressBar
                  value={milestone.percent}
                  tone={done ? "success" : "primary"}
                  className="mt-4"
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  {milestone.lessons.map((meta) => {
                    const completed = state.lessons[String(meta.lesson)]?.completed;
                    const unlocked = access(meta.lesson);
                    const category = categoryById.get(meta.category);
                    return (
                      <Link
                        key={meta.lesson}
                        href={unlocked ? `/lesson/${meta.lesson}` : "/learn/settings#premium"}
                        className={cn(
                          "flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition",
                          completed
                            ? "border-success/40 bg-success/15 text-success"
                            : unlocked
                              ? "border-line bg-surface hover:border-primary/50"
                              : "border-line bg-background-soft text-muted",
                        )}
                      >
                        <span className="text-xs font-bold text-muted">{meta.lesson}</span>
                        {unlocked ? meta.title : <Lock className="h-4 w-4" />}
                      </Link>
                    );
                  })}
                </div>
              </Card>
            </li>
          );
        })}
      </ol>

      <Card className="border-accent/50 bg-accent/12">
        <p className="text-sm font-bold">Следующий шаг</p>
        <p className="mt-1 text-sm text-muted">
          {milestones.find((item) => !item.completed)
            ? `Откройте «${milestones.find((item) => !item.completed)?.title}» — до цели ${100 - (milestones.find((item) => !item.completed)?.percent ?? 0)}%.`
            : "Все этапы пройдены. Заберите сертификат о прохождении курса!"}
        </p>
        <Link
          href={milestones.find((item) => !item.completed) ? "/learn" : "/certificate"}
          className="mt-3 inline-flex text-sm font-bold text-primary underline decoration-primary/40"
        >
          {milestones.find((item) => !item.completed) ? "Продолжить обучение →" : "Открыть сертификат →"}
        </Link>
      </Card>
    </div>
  );
}
