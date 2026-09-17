import type { NextRequest } from "next/server";
import { errorResponse, jsonResponse, readJsonBody } from "@/server/http";
import { currentUser } from "@/server/http";
import {
  fulfillOrder,
  getOrderForUser,
  verifyOrderThroughStarsHistory,
} from "@/server/orders";

export const dynamic = "force-dynamic";

interface OrderStatusPayload {
  ok: true;
  orderId: number;
  status: string;
  stars: number;
  currency: string;
  invoiceLink: string | null;
  license: { key: string; productId: string; source: string; issuedAt: string } | null;
  verification: "webhook" | "stars-history" | "none";
}

async function resolve(request: NextRequest, orderId: number): Promise<Response> {
  const user = await currentUser(request);
  if (!user) return errorResponse("Требуется вход через Telegram.", 401);

  const order = await getOrderForUser(orderId, user.id);
  if (!order) return errorResponse("Заказ не найден", 404);

  if (order.status === "paid") {
    const fulfilled = await fulfillOrder(order.id, order.chargeId);
    const payload: OrderStatusPayload = {
      ok: true,
      orderId: order.id,
      status: "paid",
      stars: order.stars,
      currency: order.currency,
      invoiceLink: order.invoiceLink,
      license: fulfilled?.license
        ? {
            key: fulfilled.license.key,
            productId: fulfilled.license.productId,
            source: fulfilled.license.source,
            issuedAt: new Date(fulfilled.license.issuedAt).toISOString(),
          }
        : null,
      verification: "webhook",
    };
    return jsonResponse(payload);
  }

  // The webhook is the source of truth; this history check is the fallback for
  // deployments where the bot webhook is not reachable.
  const verification = await verifyOrderThroughStarsHistory(order, user.telegramId);
  if (verification.paid && verification.chargeId) {
    const fulfilled = await fulfillOrder(order.id, verification.chargeId);
    const payload: OrderStatusPayload = {
      ok: true,
      orderId: order.id,
      status: "paid",
      stars: order.stars,
      currency: order.currency,
      invoiceLink: order.invoiceLink,
      license: fulfilled?.license
        ? {
            key: fulfilled.license.key,
            productId: fulfilled.license.productId,
            source: fulfilled.license.source,
            issuedAt: new Date(fulfilled.license.issuedAt).toISOString(),
          }
        : null,
      verification: "stars-history",
    };
    return jsonResponse(payload);
  }

  const payload: OrderStatusPayload = {
    ok: true,
    orderId: order.id,
    status: order.status,
    stars: order.stars,
    currency: order.currency,
    invoiceLink: order.invoiceLink,
    license: null,
    verification: "none",
  };
  return jsonResponse(payload);
}

/** GET /api/payments/telegram/order?orderId=1 — poll payment status. */
export async function GET(request: NextRequest) {
  try {
    const { db } = await import("@/db");
    await db.execute(await (await import("drizzle-orm")).sql`select 1`);
  } catch {
    return errorResponse("Server persistence is unavailable. The offline trainer continues to work.", 503);
  }

  const orderId = Number(new URL(request.url).searchParams.get("orderId"));
  if (!Number.isFinite(orderId) || orderId <= 0) return errorResponse("orderId is required");
  return resolve(request, orderId);
}

/** POST /api/payments/telegram/order { orderId } — force a verification pass. */
export async function POST(request: NextRequest) {
  const body = await readJsonBody<{ orderId?: number }>(request);
  const orderId = Number(body?.orderId);
  if (!Number.isFinite(orderId) || orderId <= 0) return errorResponse("orderId is required");
  return resolve(request, orderId);
}
