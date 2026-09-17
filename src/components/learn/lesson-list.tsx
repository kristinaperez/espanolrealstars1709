"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Lock, Search } from "lucide-react";
import { Badge, Card, Input, ProgressBar } from "@/components/ui/card";
import { useProgress } from "@/components/providers/progress-provider";
import { categoryById, milestones, FREE_LESSON_COUNT, STARS_PRICE } from "@/lib/content/config";
import { cn } from "@/lib/utils";

export function LessonList({ examBlocks }: { examBlocks: { block: number; fromLesson: number; toLesson: number; phraseCount: number }[] }) {
  const { state, metas, access, premium } = useProgress();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [onlyTodo, setOnlyTodo] = useState(false);

  const categories = useMemo(() => {
    const ids = Array.from(new Set(metas.map((meta) => meta.category)));
    return ids;
  }, [metas]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return metas.filter((meta) => {
      if (category !== "all" && meta.category !== category) return false;
      if (onlyTodo && state.lessons[String(meta.lesson)]?.completed) return false;
      if (!q) return true;
      return (
        meta.title.toLowerCase().includes(q) ||
        (meta.summary ?? "").toLowerCase().includes(q) ||
        meta.tags.join(" ").toLowerCase().includes(q) ||
        String(meta.lesson) === q
      );
    });
  }, [category, metas, onlyTodo, query, state.lessons]);

  const grouped = useMemo(() => {
    return milestones
      .map((milestone) => ({
        milestone,
        lessons: visible.filter((meta) => meta.milestone === milestone.id),
      }))
      .filter((group) => group.lessons.length > 0);
  }, [visible]);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Программа курса</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Уроки</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          {metas.length} уроков по учебнику: от первых фраз до собеседования и жизни «как дома». Каждый 5-й урок —
          экзамен.
        </p>
      </header>

      <Card className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <Input
            id="lesson-search"
            name="lesson-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по урокам, темам и тегам…"
            className="pl-12"
          />
        </div>
        <div className="hide-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <FilterChip active={category === "all"} onClick={() => setCategory("all")}>
            Все темы
          </FilterChip>
          {categories.map((id) => {
            const item = categoryById.get(id);
            return (
              <FilterChip key={id} active={category === id} onClick={() => setCategory(id)}>
                {item?.emoji} {item?.labelRu ?? id}
              </FilterChip>
            );
          })}
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-muted">
          <input
            id="only-uncompleted"
            name="only-uncompleted"
            type="checkbox"
            checked={onlyTodo}
            onChange={(event) => setOnlyTodo(event.target.checked)}
            className="h-4 w-4 accent-[var(--primary)]"
          />
          Только непройденные
        </label>
      </Card>

      {grouped.map((group) => {
        const total = metas.filter((meta) => meta.milestone === group.milestone.id).length;
        const done = metaisDone(metas, group.milestone.id, state);
        return (
          <section key={group.milestone.id} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
                <span className="text-2xl">{group.milestone.emoji}</span> {group.milestone.title}
              </h2>
              <Badge tone={done === total ? "success" : "neutral"}>
                {done}/{total}
              </Badge>
            </div>
            <ProgressBar value={(done / Math.max(1, total)) * 100} />
            <div className="grid gap-3 sm:grid-cols-2">
              {group.lessons.map((meta) => {
                const lessonState = state.lessons[String(meta.lesson)];
                const unlocked = access(meta.lesson);
                const categoryItem = categoryById.get(meta.category);
                return (
                  <Link
                    key={meta.lesson}
                    href={unlocked ? `/lesson/${meta.lesson}` : "/learn/settings#premium"}
                    className={cn(
                      "group flex flex-col gap-2 rounded-3xl border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_10px_30px_rgba(28,21,18,0.08)]",
                      !unlocked && "opacity-80",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-muted">Урок {meta.lesson}</span>
                      {lessonState?.completed ? (
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-success text-white">
                          <Check className="h-4 w-4" />
                        </span>
                      ) : unlocked ? (
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-background-soft text-xs font-bold text-muted">
                          {meta.difficulty}
                        </span>
                      ) : (
                        <Lock className="h-5 w-5 text-muted" />
                      )}
                    </div>
                    <p className="text-base font-extrabold leading-snug tracking-tight">{meta.title}</p>
                    <p className="line-clamp-2 text-sm text-muted">{meta.summary ?? meta.subtitle}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge>
                        {categoryItem?.emoji} {categoryItem?.labelRu}
                      </Badge>
                      <Badge>{meta.phraseCount} фраз</Badge>
                      {lessonState?.bestScore ? (
                        <Badge tone="success">
                          {lessonState.bestScore}/{lessonState.bestTotal || meta.phraseCount * 2}
                        </Badge>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-extrabold tracking-tight">🎓 Экзамены</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {examBlocks.map((block) => {
            const examState = state.exams[String(block.block)];
            const unlocked = access(block.toLesson);
            return (
              <Link
                key={block.block}
                href={unlocked ? `/exam/${block.block}` : "/learn/settings#premium"}
                className="flex flex-col gap-2 rounded-3xl border border-line bg-background-soft p-4 transition hover:border-accent"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted">Экзамен {block.block}</span>
                  {examState ? <Badge tone="success">{examState.score}/{examState.total}</Badge> : unlocked ? <Badge tone="accent">готов</Badge> : <Lock className="h-4 w-4 text-muted" />}
                </div>
                <p className="text-sm font-bold">Уроки {block.fromLesson}–{block.toLesson}</p>
                <p className="text-xs text-muted">{block.phraseCount} фраз в базе экзамена</p>
              </Link>
            );
          })}
        </div>
        {!premium ? (
          <p className="text-sm text-muted">
            🔒 После урока {FREE_LESSON_COUNT} курс открывается разовой покупкой —{" "}
            <Link href="/learn/settings#premium" className="font-bold text-primary underline">
              {STARS_PRICE} ⭐ в Telegram
            </Link>
            .
          </p>
        ) : null}
      </section>
    </div>
  );
}

function metaisDone(
  metas: { lesson: number; milestone: string }[],
  milestoneId: string,
  state: { lessons: Record<string, { completed?: boolean }> },
) {
  return metas.filter((meta) => meta.milestone === milestoneId && state.lessons[String(meta.lesson)]?.completed).length;
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition",
        active ? "border-primary bg-primary text-primary-contrast" : "border-line bg-surface text-muted hover:border-primary/40",
      )}
    >
      {children}
    </button>
  );
}
