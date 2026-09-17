"use client";

import { useState } from "react";
import type { LessonPhrase } from "@/lib/content/types";
import { Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FlipCard({
  phrase,
  reverse,
  index,
  total,
  onKnown,
  difficulty,
}: {
  phrase: LessonPhrase;
  reverse: boolean;
  index: number;
  total: number;
  onKnown: () => void;
  difficulty?: string;
}) {
  const [flipped, setFlipped] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const front = reverse ? phrase.translation : phrase.spanish;
  const back = reverse ? phrase.spanish : phrase.translation;

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between text-xs font-semibold text-muted">
        <span>
          {reverse ? "Русский → Español" : "Español → Русский"} · {index + 1}/{total}
        </span>
        {difficulty ? <Badge tone="accent">{difficulty}</Badge> : null}
      </div>

      <button
        type="button"
        onClick={() => {
          setFlipped(true);
          setRevealed(true);
        }}
        className={cn("flip min-h-[260px] w-full text-left", flipped && "is-flipped")}
        aria-label="Показать перевод"
      >
        <div className="flip-inner min-h-[260px]">
          <div className="flip-face flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-3xl border border-line bg-surface p-6 text-center shadow-[0_6px_28px_rgba(28,21,18,0.07)]">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted">
              {reverse ? "Как сказать по-испански?" : "Что это значит?"}
            </span>
            <p className="text-2xl font-extrabold leading-snug tracking-tight sm:text-3xl">{front}</p>
            <span className="mt-2 text-sm text-muted">нажмите, чтобы перевернуть ↻</span>
          </div>
          <div className="flip-back flip-face flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-primary/40 bg-primary/8 p-6 text-center">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              {reverse ? "Español" : "Перевод"}
            </span>
            <p className="text-2xl font-extrabold leading-snug tracking-tight sm:text-3xl">{back}</p>
            {phrase.example ? (
              <p className="mt-1 text-sm text-muted">
                <span className="font-semibold text-foreground">{phrase.example}</span>
                {phrase.exampleTranslation ? ` — ${phrase.exampleTranslation}` : ""}
              </p>
            ) : null}
          </div>
        </div>
      </button>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button
          variant="secondary"
          block
          size="lg"
          onClick={() => {
            setFlipped(false);
            setRevealed(false);
          }}
        >
          Перевернуть
        </Button>
        <Button
          variant="success"
          block
          size="lg"
          disabled={!revealed}
          onClick={() => {
            onKnown();
            setFlipped(false);
            setRevealed(false);
          }}
        >
          Понятно, дальше
        </Button>
      </div>
    </div>
  );
}
