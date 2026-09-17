"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, CreditCard, ExternalLink, Loader2, RefreshCw, Star } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useProgress } from "@/components/providers/progress-provider";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { openInvoiceLink } from "@/lib/telegram/webapp";
import { TelegramLogin } from "@/components/auth/telegram-login";

type Phase = "idle" | "creating" | "awaiting" | "verifying" | "paid" | "error";

interface OrderResponse {
  ok: boolean;
  error?: string;
  orderId: number;
  invoiceLink: string;
  stars: number;
  currency: string;
}

interface StatusResponse {
  ok: boolean;
  error?: string;
  orderId: number;
  status: string;
  stars: number;
  invoiceLink: string | null;
  license: { key: string; productId: string; source: string; issuedAt: string } | null;
  verification: "webhook" | "stars-history" | "none";
}

const POLL_INTERVAL = 3000;
const POLL_ATTEMPTS = 40;

/**
 * Telegram Stars checkout for the Premium unlock (500 ⭐ by default).
 * Works both in a browser tab (invoice link) and inside a Telegram Mini App
 * (`Telegram.WebApp.openInvoice`).
 */
export function TelegramStarsPayment({ compact = false }: { compact?: boolean }) {
  const { user, starsPrice, status: authStatus, refresh, serverPremium, account } = useAuth();
  const { state, dispatch } = useProgress();
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [openedIn, setOpenedIn] = useState<"webapp" | "browser" | null>(null);
  const pollRef = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const activate = useCallback(
    (key: string) => {
      dispatch({ type: "activate", key });
      setPhase("paid");
      setMessage("Premium активирован!");
      void refresh();
    },
    [dispatch, refresh],
  );

  const checkOrder = useCallback(
    async (orderId: number): Promise<boolean> => {
      try {
        const response = await fetch(`/api/payments/telegram/order?orderId=${orderId}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as StatusResponse;
        if (!response.ok) {
          setError(payload.error ?? "Не удалось проверить оплату.");
          return false;
        }
        if (payload.status === "paid" && payload.license) {
          activate(payload.license.key);
          return true;
        }
        return false;
      } catch (caught) {
        setError((caught as Error).message);
        return false;
      }
    },
    [activate],
  );

  const startPolling = useCallback(
    (orderId: number) => {
      stopPolling();
      let attempts = 0;
      pollRef.current = window.setInterval(async () => {
        attempts += 1;
        const paid = await checkOrder(orderId);
        if (paid || attempts >= POLL_ATTEMPTS) {
          stopPolling();
          if (!paid) {
            setPhase("idle");
            setMessage(
              "Оплата ещё не подтверждена. Нажмите «Проверить оплату» через несколько секунд.",
            );
          }
        }
      }, POLL_INTERVAL);
    },
    [checkOrder, stopPolling],
  );

  const buy = useCallback(async () => {
    setError(null);
    setMessage(null);
    setPhase("creating");
    try {
      const response = await fetch("/api/payments/telegram/stars", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: account?.productId ?? "premium-45" }),
      });
      const payload = (await response.json()) as OrderResponse;
      if (!response.ok || !payload.invoiceLink) {
        setError(payload.error ?? "Не удалось создать счёт.");
        setPhase("error");
        return;
      }
      setOrder(payload);
      setPhase("awaiting");
      const how = openInvoiceLink(payload.invoiceLink, (status) => {
        if (status === "paid") {
          setPhase("verifying");
          void checkOrder(payload.orderId);
        } else if (status === "cancelled") {
          setPhase("idle");
          setMessage("Оплата отменена. Вы можете попробовать снова.");
        } else if (status === "failed") {
          setPhase("idle");
          setError("Платёж не прошёл. Попробуйте ещё раз.");
        }
      });
      setOpenedIn(how);
      if (how === "browser") {
        setMessage("Счёт открыт в браузере. Если Telegram не открылся автоматически, нажмите «Открыть счёт заново». После оплаты вернитесь сюда.");
        startPolling(payload.orderId);
      }
    } catch (caught) {
      setError((caught as Error).message);
      setPhase("error");
    }
  }, [account?.productId, checkOrder, startPolling]);

  const restore = useCallback(async () => {
    setError(null);
    setMessage(null);
    await refresh();
    const key = account?.premium.key;
    if (key) {
      activate(key);
      return;
    }
    setError("Активной покупки не найдено для этого аккаунта Telegram.");
  }, [account?.premium.key, activate, refresh]);

  // ---------------- render ----------------

  if (authStatus === "loading") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Проверяем аккаунт…
      </div>
    );
  }

  if (authStatus === "local") {
    return (
      <div className="rounded-3xl border border-line bg-background-soft p-4">
        <p className="text-sm font-bold">Оплата звёздами Telegram</p>
        <p className="mt-1 text-sm text-muted">
          Онлайн-оплата недоступна: приложение работает в локальном режиме. Откройте сайт с подключённым сервером
          и базой данных, чтобы оплатить звёздами.
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col gap-4 rounded-3xl border border-primary/30 bg-primary/8 p-4">
        <div>
          <p className="text-sm font-bold">Войдите через Telegram, чтобы оплатить звёздами</p>
          <p className="mt-1 text-sm text-muted">
            Premium — {starsPrice} ⭐ (разовая покупка). После входа здесь появится кнопка оплаты — переходить на другую страницу не нужно.
          </p>
        </div>
        <TelegramLogin variant="compact" />
      </div>
    );
  }

  const alreadyPremium = serverPremium || Boolean(state.license);

  if (phase === "paid") {
    return (
      <Card className="flex flex-col gap-3 border-success/50 bg-success/8">
        <p className="flex items-center gap-2 text-base font-extrabold text-success">
          <Check className="h-5 w-5" /> Premium активирован
        </p>
        <p className="text-sm text-muted">
          Все уроки, экзамены, полное повторение и сертификат открыты. Доступ привязан к вашему Telegram, поэтому
          он восстановится на любом устройстве.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/learn/lessons"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-5 text-[15px] font-semibold text-primary-contrast shadow-[0_4px_0_0_var(--primary-strong)]"
          >
            Открыть все уроки →
          </Link>
        </div>
      </Card>
    );
  }

  if (alreadyPremium) {
    return (
      <Card className="flex flex-col gap-2 border-success/40 bg-success/8">
        <p className="flex items-center gap-2 text-sm font-extrabold text-success">
          <Check className="h-5 w-5" /> Premium уже активен
        </p>
        <p className="text-sm text-muted">
          Спасибо за поддержку проекта! Все 45 уроков и система повторения открыты.
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge tone="success">{starsPrice} ⭐ оплачено</Badge>
        </div>
        <div className="mt-1 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => void restore()}>
            <RefreshCw className="h-4 w-4" /> Восстановить покупку
          </Button>
          <Link
            href="/learn/lessons"
            className="inline-flex h-9 items-center justify-center rounded-2xl border border-line px-4 text-sm font-semibold"
          >
            К урокам
          </Link>
        </div>
      </Card>
    );
  }

  const busy = phase === "creating" || phase === "verifying";

  return (
    <div className={compact ? "flex flex-col gap-3" : "flex flex-col gap-4"}>
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-2 text-base font-extrabold tracking-tight">
          <Star className="h-5 w-5 text-accent" /> Premium за {starsPrice} звёзд
        </p>
        <p className="text-sm text-muted">
          Оплата внутри Telegram: Stars списываются с вашего баланса. Без карты, без подписки, доступ навсегда.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button size="lg" onClick={() => void buy()} disabled={busy}>
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Star className="h-5 w-5" />}
          {busy ? "Создаём счёт…" : `Оплатить ${starsPrice} ⭐`}
        </Button>
        {order ? (
          <Button variant="secondary" size="lg" onClick={() => void checkOrder(order.orderId)}>
            <CreditCard className="h-5 w-5" /> Проверить оплату
          </Button>
        ) : null}
      </div>

      {order?.invoiceLink ? (
        <a
          href={order.invoiceLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1.5 text-xs font-bold text-primary underline decoration-primary/40"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Открыть счёт заново
        </a>
      ) : null}

      {phase === "awaiting" ? (
        <p className="flex items-center gap-2 text-sm font-semibold text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          {openedIn === "webapp"
            ? "Ожидаем подтверждение оплаты в Telegram…"
            : "Ожидаем оплату. Как только Telegram подтвердит платёж, доступ откроется автоматически."}
        </p>
      ) : null}

      {message ? <p className="text-sm font-semibold">{message}</p> : null}
      {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Badge tone="accent">Разовая покупка</Badge>
        <Badge tone="success">Без подписки</Badge>
        <Badge tone="info">Возврат через @BotFather</Badge>
      </div>

      <p className="text-xs text-muted">
        Покупка привязана к аккаунту Telegram и восстанавливается автоматически при следующем входе.
      </p>
    </div>
  );
}
