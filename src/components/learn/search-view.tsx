"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge, Card, Input } from "@/components/ui/card";
import { useProgress } from "@/components/providers/progress-provider";
import { categoryById, milestoneById } from "@/lib/content/config";
import type { IndexedPhrase } from "@/lib/content/types";
import { cn, formatDateRu } from "@/lib/utils";

type Field = "all" | "spanish" | "translation" | "tags" | "lesson";

const FIELDS: { id: Field; label: string }[] = [
  { id: "all", label: "Везде" },
  { id: "spanish", label: "Español" },
  { id: "translation", label: "Русский" },
  { id: "tags", label: "Теги" },
  { id: "lesson", label: "Урок / ситуация" },
];

export function SearchView({ phrases }: { phrases: IndexedPhrase[] }) {
  const { metas, access } = useProgress();
  const [query, setQuery] = useState("");
  const [field, setField] = useState<Field>("all");
  const [limit, setLimit] = useState(40);

  const lessonsById = useMemo(() => new Map(metas.map((meta) => [meta.lesson, meta])), [metas]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return phrases.filter((phrase) => {
      const meta = lessonsById.get(phrase.lesson);
      const haystack = {
        spanish: phrase.spanish.toLowerCase(),
        translation: phrase.translation.toLowerCase(),
        tags: (phrase.tags ?? []).join(" ").toLowerCase(),
        lesson: `${phrase.lesson} ${meta?.title.toLowerCase() ?? ""} ${meta?.summary?.toLowerCase() ?? ""} ${
          meta?.situation?.toLowerCase() ?? ""
        } ${meta?.tags.join(" ").toLowerCase() ?? ""} ${categoryById.get(meta?.category ?? "")?.labelRu.toLowerCase() ?? ""}`,
      };
      if (field === "all") {
        return Object.values(haystack).some((value) => value.includes(q));
      }
      return haystack[field].includes(q);
    });
  }, [field, lessonsById, phrases, query]);

  const grouped = useMemo(() => {
    const map = new Map<number, IndexedPhrase[]>();
    for (const phrase of results) {
      const list = map.get(phrase.lesson) ?? [];
      list.push(phrase);
      map.set(phrase.lesson, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [results]);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Справочник</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Поиск фраз</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Найдите любую фразу из учебника: по-испански, по-русски, по тегу, по уроку или ситуации. В базе{" "}
          {phrases.length} фраз.
        </p>
      </header>

      <Card className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <Input
            id="phrase-search"
            name="phrase-search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setLimit(40);
            }}
            placeholder="Me cuentas, врач, банковский счёт, transport…"
            className="pl-12"
          />
        </div>
        <div className="hide-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {FIELDS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setField(item.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition",
                field === item.id
                  ? "border-primary bg-primary text-primary-contrast"
                  : "border-line bg-surface text-muted hover:border-primary/40",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        {query.trim().length >= 2 ? (
          <p className="text-xs font-semibold text-muted">Найдено: {results.length}</p>
        ) : null}
      </Card>

      {query.trim().length < 2 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <p className="text-sm font-bold">Категории</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[...categoryById.values()].map((category) => (
                <Badge key={category.id}>
                  {category.emoji} {category.labelRu}
                </Badge>
              ))}
            </div>
          </Card>
          <Card>
            <p className="text-sm font-bold">Этапы адаптации</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[...milestoneById.values()].map((milestone) => (
                <Badge key={milestone.id} tone="primary">
                  {milestone.emoji} {milestone.title}
                </Badge>
              ))}
            </div>
          </Card>
        </div>
      ) : results.length === 0 ? (
        <Card className="text-sm text-muted">Ничего не найдено. Попробуйте другое слово или тег.</Card>
      ) : (
        <div className="flex flex-col gap-4">
          {grouped.slice(0, limit).map(([lessonNumber, items]) => {
            const meta = lessonsById.get(lessonNumber);
            const category = categoryById.get(meta?.category ?? "");
            return (
              <Card key={lessonNumber}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-muted">
                      Урок {lessonNumber} · {category?.emoji} {category?.labelRu}
                    </p>
                    <p className="truncate text-base font-extrabold">{meta?.title}</p>
                  </div>
                  <Link
                    href={access(lessonNumber) ? `/lesson/${lessonNumber}` : "/learn/settings#premium"}
                    className="rounded-2xl border border-line px-4 py-2 text-sm font-bold hover:border-primary"
                  >
                    Открыть урок
                  </Link>
                </div>
                <ul className="mt-3 flex flex-col divide-y divide-line">
                  {items.map((phrase) => (
                    <li key={`${phrase.lesson}-${phrase.index}`} className="py-3">
                      <p className="text-base font-bold tracking-tight">{phrase.spanish}</p>
                      <p className="text-sm text-muted">{phrase.translation}</p>
                      {phrase.example ? (
                        <p className="mt-1 text-sm text-muted">
                          <span className="font-semibold text-foreground">{phrase.example}</span>
                          {phrase.exampleTranslation ? ` — ${phrase.exampleTranslation}` : ""}
                        </p>
                      ) : null}
                      {phrase.tags?.length ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {phrase.tags.map((tag) => (
                            <Badge key={tag}>{tag}</Badge>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
          {grouped.length > limit ? (
            <button
              type="button"
              onClick={() => setLimit(limit + 40)}
              className="mx-auto rounded-2xl border border-line bg-surface px-6 py-3 text-sm font-bold hover:border-primary"
            >
              Показать ещё
            </button>
          ) : null}
        </div>
      )}

      <p className="text-xs text-muted">
        Прогресс сохраняется локально на устройстве. Последнее обновление курса: {formatDateRu("2026-01-01")}
      </p>
    </div>
  );
}
