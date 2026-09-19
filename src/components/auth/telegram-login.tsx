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
 *
 * Uses `data-onauth` so the session is established via POST without a full-page
 * redirect — the payment button appears immediately after login.
 */
export function TelegramLogin({ variant = "full" }: { variant?: "full" | "compact" }) {
  const { botUsername, authenticating, error, user, logout, miniApp, loginWithWidgetData } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [widgetError, setWidgetError] = useState<string | null>(null);
  const [hostname, setHostname] = useState<string | null>(null);
  const [showWidget, setShowWidget] = useState(true);

  useEffect(() => {
    setHostname(window.location.hostname);
  }, []);

  useEffect(() => {
    setShowWidget(!user && !miniApp);
  }, [user, miniApp]);

  useEffect(() => {
    if (!botUsername || user || miniApp || !showWidget) return;
    const container = containerRef.current;
    if (!container) return;
    if (container.querySelector("script, iframe")) return;

    window.onTelegramAuth = (data) => {
      void (async () => {
        const ok = await loginWithWidgetData(data);
        if (ok) {
          // Telegram replaces the script node with its own iframe. Clear the
          // whole mount point immediately so the old "Войти как…" button
          // cannot remain visible during the React state update.
          container.replaceChildren();
          setShowWidget(false);
        }
      })();
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", variant === "compact" ? "large" : "large");
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
      script.remove();
      container.replaceChildren();
      delete window.onTelegramAuth;
    };
  }, [botUsername, loginWithWidgetData, user, miniApp, variant, showWidget]);

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
      {showWidget ? (
        <div ref={containerRef} className="flex min-h-[40px] items-center justify-center overflow-hidden" />
      ) : null}
      {authenticating ? (
        <p className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Star className="h-4 w-4 animate-flame" /> Подтверждаем данные Telegram…
        </p>
      ) : null}
      {widgetError ? <p className="text-sm font-semibold text-danger">{widgetError}</p> : null}
      {error ? (
        <div className="rounded-2xl border border-danger/30 bg-danger/8 p-3">
          <p className="text-sm font-semibold text-danger">{error}</p>
          {error.includes("TELEGRAM_BOT_TOKEN") || error.includes("Подпись Telegram") ? (
            <p className="mt-1 text-xs text-muted">На сервере токен должен принадлежать именно тому Telegram-боту, который указан в кнопке входа.</p>
          ) : null}
        </div>
      ) : null}
      {variant === "full" ? (
        <>
          <p className="text-xs text-muted">
            Мы получаем только имя, username и Telegram ID. Прогресс обучения остаётся на вашем устройстве:
            аккаунт нужен только для оплаты и восстановления покупки.
          </p>
          {hostname ? (
            <p className="text-xs text-muted">
              Если видите «Bot domain invalid», откройте @BotFather → /setdomain → добавьте домен{" "}
              <code className="font-mono font-bold">{hostname}</code> (без https:// и без www, если сайт открывается
              без www).
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Badge tone="info">Без пароля</Badge>
            <Badge tone="success">Официальный виджет Telegram</Badge>
          </div>
        </>
      ) : null}
    </div>
  );
}
