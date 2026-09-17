"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Check, Download, KeyRound, ShieldCheck, Star, Upload } from "lucide-react";
import { Badge, Card, Input, Switch } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TelegramLogin } from "@/components/auth/telegram-login";
import { TelegramStarsPayment } from "@/components/payments/telegram-stars";
import { useProgress } from "@/components/providers/progress-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { course, pricing } from "@/lib/content/config";
import { formatKey, isValidKey } from "@/lib/license";
import { exportProgress, importProgress } from "@/lib/progress/storage";
import { cn } from "@/lib/utils";

export function SettingsView() {
  const { state, dispatch, ready, premium } = useProgress();
  const { user, starsPrice, status: authStatus } = useAuth();
  const [key, setKey] = useState("");
  const [keyError, setKeyError] = useState<string | null>(null);
  const [keyNotice, setKeyNotice] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /** Prefer the authoritative server check, fall back to the offline checksum. */
  const activate = async () => {
    const clean = key.trim();
    if (clean.length === 0) return;
    setKeyError(null);
    setKeyNotice(null);

    if (authStatus === "server") {
      try {
        const response = await fetch("/api/licenses/activate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ key: clean }),
        });
        const payload = (await response.json()) as { ok: boolean; valid?: boolean; key?: string; error?: string };
        if (payload.valid && payload.key) {
          dispatch({ type: "activate", key: payload.key });
          setKey("");
          setKeyNotice("Ключ подтверждён на сервере. Premium активирован.");
          return;
        }
        if (isValidKey(clean)) {
          // Valid format but unknown to the database.
          dispatch({ type: "activate", key: formatKey(clean) });
          setKey("");
          setKeyNotice("Ключ активирован локально (офлайн-проверка формата).");
          return;
        }
        setKeyError("Ключ не найден. Формат: XXXX-XXXX-XXXX");
        return;
      } catch {
        // fall through to the offline check
      }
    }

    if (isValidKey(clean)) {
      dispatch({ type: "activate", key: formatKey(clean) });
      setKey("");
      setKeyNotice("Ключ активирован локально (офлайн-режим).");
    } else {
      setKeyError("Ключ не распознан. Формат: XXXX-XXXX-XXXX");
    }
  };

  const download = () => {
    const blob = new Blob([exportProgress(state)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "espanol-real-progress.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const upload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = importProgress(String(reader.result));
        dispatch({ type: "reset" });
        window.localStorage.setItem("espanol-real:progress:v1", JSON.stringify(next));
        window.location.reload();
      } catch {
        setImportError("Не удалось прочитать файл прогресса");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Настройки</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Профиль и доступ</h1>
        <p className="mt-2 text-sm text-muted">
          Прогресс хранится локально в браузере. Аккаунт Telegram нужен только для оплаты звёздами и восстановления
          покупки на другом устройстве.
        </p>
      </header>

      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold">Аккаунт Telegram</p>
          <Badge tone={authStatus === "server" ? "success" : "neutral"}>
            {authStatus === "server" ? "онлайн" : authStatus === "loading" ? "проверка…" : "локальный режим"}
          </Badge>
        </div>
        <TelegramLogin />
      </Card>

      <Card className="flex flex-col gap-4">
        <p className="text-sm font-bold">Ученик</p>
        <label className="flex flex-col gap-2 text-sm font-semibold">
          Имя для сертификата
          <Input
            id="certificate-student-name"
            name="certificate-student-name"
            autoComplete="name"
            value={state.settings.studentName}
            onChange={(event) => dispatch({ type: "setSettings", patch: { studentName: event.target.value } })}
            placeholder="Например: Irina"
          />
        </label>
        <div>
          <p className="text-sm font-bold">Цель на день</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[10, 25, 50, 100].map((goal) => (
              <button
                key={goal}
                type="button"
                onClick={() => dispatch({ type: "setDailyGoal", value: goal })}
                className={cn(
                  "rounded-2xl border px-4 py-2 text-sm font-bold transition",
                  state.dailyGoal === goal
                    ? "border-primary bg-primary text-primary-contrast"
                    : "border-line bg-surface text-muted hover:border-primary/40",
                )}
              >
                {goal} XP
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <p className="text-sm font-bold">Интерфейс</p>
        <div>
          <p className="text-sm font-semibold">Тема</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["light", "dark", "system"] as const).map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => dispatch({ type: "setSettings", patch: { theme } })}
                className={cn(
                  "rounded-2xl border px-4 py-2 text-sm font-bold transition",
                  state.settings.theme === theme
                    ? "border-primary bg-primary text-primary-contrast"
                    : "border-line bg-surface text-muted hover:border-primary/40",
                )}
              >
                {theme === "light" ? "☀️ Светлая" : theme === "dark" ? "🌙 Тёмная" : "🖥 Системная"}
              </button>
            ))}
          </div>
        </div>
        <SettingRow
          title="Звуковые эффекты"
          description="Короткие сигналы на правильный и неправильный ответ."
          checked={state.settings.sound}
          onChange={(sound) => dispatch({ type: "setSettings", patch: { sound } })}
        />
        <SettingRow
          title="Сердечки (5 жизней)"
          description="Экспериментальный режим: ошибка отнимает сердце, восстановление каждые 4 часа."
          checked={state.settings.hearts}
          onChange={(hearts) => dispatch({ type: "setSettings", patch: { hearts } })}
        />
        {state.settings.hearts ? (
          <p className="rounded-2xl bg-background-soft px-4 py-3 text-sm font-semibold">
            ❤️ Доступно: {state.hearts.count}
          </p>
        ) : null}
      </Card>

      {/* ---------------- Premium / оплата ---------------- */}
      <Card
        id="premium"
        className={premium ? "border-success/40 bg-success/8" : "border-primary/35 bg-primary/8"}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {premium ? (
              <ShieldCheck className="h-5 w-5 text-success" />
            ) : (
              <Star className="h-5 w-5 text-primary" />
            )}
            <p className="text-sm font-bold">
              {premium ? "Premium активен" : `Premium · ${starsPrice} ⭐`}
            </p>
          </div>
          {user ? (
            <Badge tone="info">
              {user.username ? `@${user.username}` : `Telegram ${user.telegramId}`}
            </Badge>
          ) : null}
        </div>

        {premium ? (
          <>
            <p className="mt-3 text-sm text-muted">
              Все уроки, экзамены и система повторения открыты. Спасибо за поддержку проекта!
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {state.license ? (
                <Badge tone="success">
                  <Check className="h-3.5 w-3.5" /> {state.license.key}
                </Badge>
              ) : null}
              <button
                type="button"
                onClick={() => dispatch({ type: "deactivate" })}
                className="text-xs font-bold text-muted underline"
              >
                Отключить ключ на этом устройстве
              </button>
            </div>
            <div className="mt-4">
              <TelegramStarsPayment compact />
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted">
              После урока {course.freeLessonCount} курс открывается разовой покупкой. Можно оплатить{" "}
              {starsPrice} звёздами Telegram или ввести лицензионный ключ.
            </p>

            <div className="mt-4">
              <TelegramStarsPayment />
            </div>

            <details className="mt-5 rounded-3xl border border-line bg-surface p-4">
              <summary className="cursor-pointer list-none text-sm font-bold">
                <KeyRound className="mr-1.5 inline h-4 w-4 text-primary" />
                У меня есть лицензионный ключ
              </summary>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Input
                  id="license-key"
                  name="license-key"
                  autoComplete="off"
                  value={key}
                  onChange={(event) => {
                    setKey(event.target.value.toUpperCase());
                    setKeyError(null);
                    setKeyNotice(null);
                  }}
                  placeholder="XXXX-XXXX-XXXX"
                  className="font-mono tracking-widest"
                />
                <Button size="lg" onClick={() => void activate()}>
                  Активировать
                </Button>
              </div>
              {keyError ? <p className="mt-2 text-sm font-semibold text-danger">{keyError}</p> : null}
              {keyNotice ? <p className="mt-2 text-sm font-semibold text-success">{keyNotice}</p> : null}
              <p className="mt-2 text-xs text-muted">
                Ключ приходит в чат с ботом после оплаты звёздами. Архитектура готова к подключению Stripe: ключ
                легко заменяется картой.
              </p>
            </details>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-line bg-surface p-4">
                <p className="text-sm font-bold">{pricing.free.title}</p>
                <p className="text-xs text-muted">{pricing.free.period}</p>
                <ul className="mt-2 flex flex-col gap-1 text-sm text-muted">
                  {pricing.free.features.slice(0, 3).map((feature) => (
                    <li key={feature}>· {feature}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border-2 border-primary/40 bg-surface p-4">
                <p className="text-sm font-bold">{pricing.premium.title}</p>
                <p className="text-xs text-muted">
                  {starsPrice} ⭐ · {pricing.premium.period}
                </p>
                <ul className="mt-2 flex flex-col gap-1 text-sm text-muted">
                  {pricing.premium.features.slice(0, 4).map((feature) => (
                    <li key={feature}>· {feature}</li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted">{pricing.premium.note}</p>
          </>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <p className="text-sm font-bold">Данные прогресса</p>
        <p className="text-sm text-muted">
          Начало пробного периода: {new Date(state.createdAt).toLocaleDateString("ru-RU")}. XP: {state.xp}.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" onClick={download}>
            <Download className="h-5 w-5" /> Скачать резервную копию
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <Upload className="h-5 w-5" /> Восстановить из файла
          </Button>
          <input
            id="progress-backup-file"
            name="progress-backup-file"
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) upload(file);
            }}
          />
        </div>
        {importError ? <p className="text-sm font-semibold text-danger">{importError}</p> : null}
        <Button
          variant="danger"
          onClick={() => {
            if (window.confirm("Сбросить весь прогресс, XP и достижения?")) {
              dispatch({ type: "reset" });
            }
          }}
        >
          Сбросить прогресс
        </Button>
      </Card>

      <Card className="flex flex-col gap-2">
        <p className="text-sm font-bold">Офлайн и установка</p>
        <p className="text-sm text-muted">
          Приложение работает без интернета и устанавливается как PWA: в браузере нажмите «Установить приложение» или
          «Добавить на главный экран».
        </p>
        <Link href="/learn/about" className="text-sm font-bold text-primary underline decoration-primary/40">
          О курсе и методе →
        </Link>
      </Card>

      {!ready ? <p className="text-xs text-muted">Загрузка…</p> : null}
    </div>
  );
}

function SettingRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted">{description}</p>
      </div>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}
