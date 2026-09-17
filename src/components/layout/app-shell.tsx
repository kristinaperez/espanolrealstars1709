"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Flame,
  Home,
  Info,
  Menu,
  Moon,
  Repeat,
  Search,
  Settings,
  Sun,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { useProgress, useStats } from "@/components/providers/progress-provider";
import { achievementById } from "@/components/providers/progress-provider";
import { courseConfig } from "@/lib/content/config";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Home> = {
  home: Home,
  book: BookOpen,
  map: Trophy,
  repeat: Repeat,
  alert: AlertCircle,
  search: Search,
  chart: BarChart3,
  settings: Settings,
  info: Info,
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { state, dispatch, ready, newAchievements, clearAchievement } = useProgress();
  const stats = useStats();
  const [open, setOpen] = useState(false);

  const nav = courseConfig.navigation;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_1fr]">
      {/* ---------- sidebar ---------- */}
      <aside className="hidden border-r border-line bg-surface lg:flex lg:h-dvh lg:flex-col lg:sticky lg:top-0">
        <Brand />
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {nav.map((item) => {
            const Icon = ICONS[item.icon] ?? Home;
            const active = pathname === item.href || (item.href !== "/learn" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-semibold transition",
                  active ? "bg-primary text-primary-contrast shadow-[0_3px_0_0_var(--primary-strong)]" : "text-muted hover:bg-background-soft hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <SidebarFooter />
      </aside>

      {/* ---------- mobile header ---------- */}
      <div className="lg:hidden">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Меню"
            className="grid h-10 w-10 place-items-center rounded-xl border border-line"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/learn" className="flex items-center gap-2 font-extrabold tracking-tight">
            <span className="text-lg">🇪🇸</span> Español Real
          </Link>
          <div className="flex items-center gap-1 text-sm font-bold">
            <span className="flex items-center gap-1 rounded-full bg-accent/25 px-2.5 py-1">
              <Flame className="h-4 w-4" /> {ready ? stats.streak : 0}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-primary/12 px-2.5 py-1 text-primary">
              <Zap className="h-4 w-4" /> {ready ? stats.xp : 0}
            </span>
          </div>
        </header>
      </div>

      {/* ---------- main ---------- */}
      <main className="min-w-0 pb-24 lg:pb-10">
        <div className="mx-auto w-full max-w-5xl px-4 pt-5 sm:px-6 lg:px-10 lg:pt-8">{children}</div>
      </main>

      {/* ---------- mobile drawer ---------- */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Закрыть"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="animate-fade-up absolute inset-y-0 left-0 flex w-[86%] max-w-xs flex-col border-r border-line bg-surface p-4">
            <div className="flex items-center justify-between">
              <Brand />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Закрыть меню"
                className="grid h-10 w-10 place-items-center rounded-xl border border-line"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-4 flex flex-1 flex-col gap-1">
              {nav.map((item) => {
                const Icon = ICONS[item.icon] ?? Home;
                const active = pathname === item.href || (item.href !== "/learn" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-semibold",
                      active ? "bg-primary text-primary-contrast" : "text-muted",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <SidebarFooter />
          </div>
        </div>
      ) : null}

      {/* ---------- mobile bottom bar ---------- */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-line bg-surface/95 px-2 py-2 backdrop-blur lg:hidden">
        {[nav[0], nav[1], nav[3], nav[6], nav[7]].map((item) => {
          const Icon = ICONS[item.icon] ?? Home;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-16 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[11px] font-bold",
                active ? "text-primary" : "text-muted",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* ---------- achievement toasts ---------- */}
      <div className="pointer-events-none fixed bottom-24 right-4 z-50 flex flex-col gap-2 lg:bottom-6">
        {newAchievements.slice(-3).map((id) => {
          const achievement = achievementById(id);
          if (!achievement) return null;
          return (
            <button
              key={id}
              type="button"
              onClick={() => clearAchievement(id)}
              className="animate-pop pointer-events-auto flex items-center gap-3 rounded-2xl border border-accent/50 bg-surface px-4 py-3 text-left shadow-[0_10px_30px_rgba(28,21,18,0.18)]"
            >
              <span className="text-2xl">{achievement.emoji}</span>
              <span>
                <span className="block text-sm font-extrabold">Достижение: {achievement.title}</span>
                <span className="block text-xs text-muted">{achievement.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      <ThemeToggle theme={state.settings.theme} onTheme={(theme) => dispatch({ type: "setSettings", patch: { theme } })} />
    </div>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 px-2 py-3">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-lg text-primary-contrast shadow-[0_3px_0_0_var(--primary-strong)]">
        🇪🇸
      </span>
      <span className="leading-tight">
        <span className="block text-base font-extrabold tracking-tight">Español Real</span>
        <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          живой испанский
        </span>
      </span>
    </Link>
  );
}

function SidebarFooter() {
  const stats = useStats();
  const { ready } = useProgress();
  return (
    <div className="mt-3 rounded-2xl bg-background-soft p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Прогресс курса</p>
      <p className="mt-1 text-2xl font-extrabold">{ready ? `${stats.coursePercent}%` : "—"}</p>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-surface">
        <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${stats.coursePercent}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted">
        {ready ? `${stats.lessonsCompleted}/${stats.lessonsTotal} уроков · ${stats.phrasesLearned} фраз` : "Загрузка…"}
      </p>
    </div>
  );
}

function ThemeToggle({
  theme,
  onTheme,
}: {
  theme: "light" | "dark" | "system";
  onTheme: (theme: "light" | "dark" | "system") => void;
}) {
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      aria-label="Переключить тему"
      onClick={() => onTheme(next)}
      className="fixed bottom-24 left-4 z-40 grid h-11 w-11 place-items-center rounded-full border border-line bg-surface shadow-[0_6px_20px_rgba(28,21,18,0.15)] lg:bottom-6 lg:left-auto lg:right-6"
    >
      {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
