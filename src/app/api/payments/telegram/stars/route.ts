import type { NextRequest } from "next/server";
import { getProduct, premiumProduct } from "@/lib/payments/catalog";
import { createStarsInvoiceLink, isBotConfigured } from "@/lib/telegram/bot-api";
import { errorResponse, jsonResponse, readJsonBody, siteOrigin } from "@/server/http";
import { currentUser } from "@/server/http";
import { attachInvoiceLink, createPendingOrder } from "@/server/orders";

export const dynamic = "force-dynamic";

/**
 * POST — creates a Telegram Stars invoice for Premium (500 ⭐ by default).
 * Returns the invoice link that the client opens via
 * `Telegram.WebApp.openInvoice()` or in a new browser tab.
 */
export async function POST(request: NextRequest) {
  try {
    const { db } = await import("@/db");
    await db.execute(await (await import("drizzle-orm")).sql`select 1`);
  } catch {
    return errorResponse("Server persistence is unavailable. The offline trainer continues to work.", 503);
  }

  if (!isBotConfigured()) {
    return errorResponse(
      "Оплата звёздами ещё не настроена: задайте переменную окружения TELEGRAM_BOT_TOKEN.",
      503,
    );
  }

  const user = await currentUser(request);
  if (!user) {
    return errorResponse("Сначала войдите через Telegram, чтобы оплатить.", 401);
  }

  const body = await readJsonBody<{ productId?: string }>(request);
  const product = getProduct(body?.productId ?? premiumProduct().id);
  if (!product) return errorResponse("Неизвестный товар", 404);

  let order;
  try {
    order = await createPendingOrder(user.id, product);
  } catch (error) {
    return errorResponse(`Не удалось создать заказ: ${(error as Error).message}`, 500);
  }

  let invoiceLink: string;
  try {
    invoiceLink = await createStarsInvoiceLink({
      title: product.title,
      description: product.description,
      payload: order.payload,
      stars: product.stars,
      photoUrl: `${siteOrigin(request)}/og.jpg`,
    });
  } catch (error) {
    return errorResponse(
      `Telegram не создал счёт: ${(error as Error).message}`,
      502,
    );
  }

  try {
    await attachInvoiceLink(order.id, invoiceLink);
  } catch {
    /* the link still works without persistence */
  }

  return jsonResponse({
    ok: true,
    orderId: order.id,
    payload: order.payload,
    invoiceLink,
    stars: product.stars,
    currency: product.currency,
    product: {
      id: product.id,
      title: product.title,
      description: product.description,
      lifetime: product.lifetime,
    },
    botConfigured: true,
  });
}
