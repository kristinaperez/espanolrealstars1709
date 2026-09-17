"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut, ShieldCheck, Star } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/card";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    onTelegramAuth?: (user: Record<string, unknown>) => void;
  }
}

/**
 * Official Telegram Login Widget.
 * The bot username comes from the server, so the bot token never reaches the client.
 */
export function TelegramLogin({ variant = "full" }: { variant?: "full" | "compact" }) {
  const { botUsername, loginWithWidgetData, authenticating, error, user, logout, miniApp } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [widgetError, setWidgetError] = useState<string | null>(null);

  useEffect(() => {
    if (!botUsername || user) return;
    const container = containerRef.current;
    if (!container) return;
    if (container.querySelector("script")) return;

    window.onTelegramAuth = (data: Record<string, unknown>) => {
      void loginWithWidgetData(data);
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-userpic", "true");
    script.setAttribute("data-radius", "16");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.onload = () => setWidgetError(null);
    script.onerror = () =>
      setWidgetError(
        "Виджет Telegram не загрузился. Проверьте, что домен приложения добавлен в BotFather (/setdomain).",
      );
    container.appendChild(script);

    return () => {
      if (window.onTelegramAuth) delete window.onTelegramAuth;
    };
  }, [botUsername, loginWithWidgetData, user]);

  if (user) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-success/40 bg-success/8 p-4">
        <div className="flex min-w-0 items-center gap-3">
          {user.photoUrl ? (
            // Telegram avatars are hosted on t.me: served as a plain <img>.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoUrl}
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 rounded-2xl object-cover"
            />
          ) : (
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/15 text-lg">🇪🇸</span>
          )}
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-sm font-extrabold">
              <ShieldCheck className="h-4 w-4 text-success" />
              {user.firstName ?? user.username ?? "Telegram"}
            </p>
            <p className="truncate text-xs text-muted">
              {user.username ? `@${user.username}` : `id ${user.telegramId}`}
              {miniApp ? " · Telegram Mini App" : " · вход выполнен"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="inline-flex items-center gap-1.5 rounded-2xl border border-line bg-surface px-3.5 py-2 text-xs font-bold text-muted transition hover:text-foreground"
        >
          <LogOut className="h-4 w-4" /> Выйти
        </button>
      </div>
    );
  }

  if (!botUsername) {
    return (
      <div className="rounded-3xl border border-line bg-background-soft p-4">
        <p className="text-sm font-bold">Вход через Telegram</p>
        <p className="mt-1 text-sm text-muted">
          Задайте переменные окружения <code className="font-mono text-xs">TELEGRAM_BOT_TOKEN</code> и{" "}
          <code className="font-mono text-xs">TELEGRAM_BOT_USERNAME</code>, чтобы включить вход и оплату звёздами.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", variant === "compact" && "gap-2")}>
      <div ref={containerRef} className="flex min-h-[40px] items-center justify-center overflow-hidden" />
      {authenticating ? (
        <p className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Star className="h-4 w-4 animate-flame" /> Подтверждаем данные Telegram…
        </p>
      ) : null}
      {widgetError ? <p className="text-sm font-semibold text-danger">{widgetError}</p> : null}
      {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}
      {variant === "full" ? (
        <>
          <p className="text-xs text-muted">
            Мы получаем только имя, username и Telegram ID. Прогресс обучения остаётся на вашем устройстве:
            аккаунт нужен только для оплаты и восстановления покупки.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge tone="info">Без пароля</Badge>
            <Badge tone="success">Официальный виджет Telegram</Badge>
          </div>
        </>
      ) : null}
    </div>
  );
}
