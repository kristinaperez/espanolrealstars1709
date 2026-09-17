"use client";

import Link from "next/link";
import { useProgress, useStats } from "@/components/providers/progress-provider";
import { Badge, Card, Input } from "@/components/ui/card";
import { formatDateRu } from "@/lib/utils";

export function CertificateView() {
  const { state, dispatch, metas } = useProgress();
  const stats = useStats();
  const completedAll = metas.length > 0 && metas.every((meta) => state.lessons[String(meta.lesson)]?.completed);

  if (!completedAll) {
    return (
      <div className="flex flex-col gap-5">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Финал</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Сертификат о прохождении</h1>
        </header>
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="text-5xl">🎓</span>
          <p className="text-lg font-bold">Сертификат пока закрыт</p>
          <p className="max-w-md text-sm text-muted">
            Он откроется после последнего, {metas.length > 0 ? metas[metas.length - 1].lesson : 45}-го урока. Осталось{" "}
            {stats.lessonsTotal - stats.lessonsCompleted} уроков — это {100 - stats.coursePercent}% курса.
          </p>
          <div className="mt-2 h-3 w-full max-w-sm overflow-hidden rounded-full bg-background-soft">
            <div className="h-full rounded-full bg-primary" style={{ width: `${stats.coursePercent}%` }} />
          </div>
          <Link
            href="/learn"
            className="mt-4 inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-6 text-[15px] font-semibold text-primary-contrast shadow-[0_4px_0_0_var(--primary-strong)]"
          >
            Продолжить обучение
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="print:hidden">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Финал</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Сертификат о прохождении</h1>
      </header>

      <Card className="mx-auto w-full max-w-3xl border-4 border-primary/30 bg-gradient-to-br from-primary/8 via-surface to-accent/12 p-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-muted">Español Real</p>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Certificate of Completion</h2>
        <p className="mt-6 text-sm text-muted">выдан</p>
        <p className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
          {state.settings.studentName?.trim() || "Estudiante de Español Real"}
        </p>
        <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed">
          за успешное прохождение курса разговорного испанского языка для жизни в Испании: {stats.lessonsTotal} уроков,{" "}
          {stats.phrasesTotal} живых фраз, {stats.examsPassed} экзаменов и{" "}
          {stats.milestonesCompleted} этапов адаптации.
        </p>

        <div className="mx-auto mt-7 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
          <Fact label="XP" value={`${stats.xp}`} />
          <Fact label="Уровень" value={`${stats.level}`} />
          <Fact label="Уроков" value={`${stats.lessonsCompleted}`} />
          <Fact label="Точность" value={`${stats.accuracy}%`} />
        </div>

        <div className="mt-8 flex flex-col items-center gap-1 text-sm text-muted">
          <span className="font-bold text-foreground">{formatDateRu(new Date().toISOString().slice(0, 10))}</span>
          <span>дата выдачи</span>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2 print:hidden">
          <Badge tone="success">Курс пройден</Badge>
          <Badge tone="accent">{stats.phrasesLearned} фраз освоено</Badge>
          <Badge tone="primary">Серия {stats.longestStreak} дн.</Badge>
        </div>
      </Card>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 print:hidden sm:flex-row">
        <label className="flex-1">
          <span className="mb-1 block text-xs font-bold text-muted">Ваше имя в сертификате</span>
          <Input
            id="certificate-name"
            name="certificate-name"
            autoComplete="name"
            value={state.settings.studentName}
            onChange={(event) => dispatch({ type: "setSettings", patch: { studentName: event.target.value } })}
            placeholder="Irina Petrova"
          />
        </label>
        <button
          type="button"
          onClick={() => window.print()}
          className="mt-6 h-12 rounded-2xl bg-primary px-6 text-[15px] font-semibold text-primary-contrast shadow-[0_4px_0_0_var(--primary-strong)]"
        >
          🖨 Распечатать / PDF
        </button>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface/80 px-3 py-3">
      <p className="text-lg font-extrabold leading-none">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</p>
    </div>
  );
}
