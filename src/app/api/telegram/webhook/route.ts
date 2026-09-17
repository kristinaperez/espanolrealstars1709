import type { NextRequest } from "next/server";
import {
  answerPreCheckoutQuery,
  sendMessage,
  type TgUpdate,
} from "@/lib/telegram/bot-api";
import { jsonResponse, readJsonBody } from "@/server/http";
import { errorResponse } from "@/server/http";
import { fulfillOrder, getOrderByPayload } from "@/server/orders";

export const dynamic = "force-dynamic";

/**
 * POST — Telegram bot webhook. This is the authoritative payment confirmation:
 *
 *   pre_checkout_query  → answerPreCheckoutQuery(ok)
 *   successful_payment  → mark the order paid + issue a license key
 *
 * Register it once with:
 *   GET /api/telegram/setup?secret=<ADMIN_SECRET or bot token>
 */
export async function POST(request: NextRequest) {
  try {
    const { db } = await import("@/db");
    await db.execute(await (await import("drizzle-orm")).sql`select 1`);
  } catch {
    return errorResponse("Server persistence is unavailable. The offline trainer continues to work.", 503);
  }

  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expected) {
    const provided = request.headers.get("x-telegram-bot-api-secret-token");
    if (provided !== expected) {
      return new Response("forbidden", { status: 403 });
    }
  }

  const update = await readJsonBody<TgUpdate>(request);
  if (!update) return jsonResponse({ ok: true, ignored: true });

  try {
    if (update.pre_checkout_query) {
      const query = update.pre_checkout_query;
      const order = await getOrderByPayload(query.invoice_payload);
      const allowed = Boolean(order) && order?.status !== "paid";
      await answerPreCheckoutQuery(
        query.id,
        allowed,
        allowed ? undefined : "Заказ не найден или уже оплачен. Обновите страницу и попробуйте снова.",
      );
      return jsonResponse({ ok: true, handled: "pre_checkout_query" });
    }

    const payment = update.message?.successful_payment;
    if (payment) {
      const order = await getOrderByPayload(payment.invoice_payload);
      if (order) {
        const fulfilled = await fulfillOrder(order.id, payment.telegram_payment_charge_id);
        const chatId = update.message?.chat?.id;
        if (fulfilled && chatId) {
          try {
            await sendMessage(
              chatId,
              [
                "🇪🇸 <b>Español Real · Premium активирован</b>",
                "",
                "Все уроки, экзамены и система повторения открыты.",
                `Ключ доступа: <code>${fulfilled.license.key}</code>`,
                "",
                "Откройте приложение и введите ключ в разделе «Настройки → Premium»,",
                "либо просто войдите через Telegram — доступ восстановится автоматически.",
              ].join("\n"),
            );
          } catch {
            /* messaging is best-effort */
          }
        }
      }
      return jsonResponse({ ok: true, handled: "successful_payment" });
    }
  } catch (error) {
    // Never answer with 5xx for unknown update types: Telegram would retry forever.
    return jsonResponse({ ok: true, error: (error as Error).message });
  }

  return jsonResponse({ ok: true, ignored: true });
}
