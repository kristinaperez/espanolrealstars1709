import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-6 py-16">
      <div className="max-w-md text-center">
        <p className="text-6xl">🧭</p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Страница не найдена</h1>
        <p className="mt-2 text-muted">
          No pasa nada — такое бывает. Вернитесь на дашборд или откройте список уроков.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/learn"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-6 text-[15px] font-semibold text-primary-contrast shadow-[0_4px_0_0_var(--primary-strong)]"
          >
            На дашборд
          </Link>
          <Link
            href="/learn/lessons"
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-line bg-surface px-6 text-[15px] font-semibold"
          >
            Все уроки
          </Link>
        </div>
      </div>
    </div>
  );
}
