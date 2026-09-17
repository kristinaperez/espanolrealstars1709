import { randomBytes } from "node:crypto";
import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { licenses, orders, telegramUsers, type LicenseRow, type OrderRow } from "@/db/schema";
import { getStarTransactions, type TgStarTransaction } from "@/lib/telegram/bot-api";
import type { Product } from "@/lib/payments/catalog";

export function buildPayload(product: Product, userId: number): string {
  return `${product.id}:${userId}:${Date.now().toString(36)}:${randomBytes(4).toString("hex")}`;
}

export async function createPendingOrder(
  userId: number,
  product: Product,
): Promise<OrderRow> {
  const [row] = await db
    .insert(orders)
    .values({
      userId,
      productId: product.id,
      stars: product.stars,
      currency: product.currency,
      status: "pending",
      payload: buildPayload(product, userId),
    })
    .returning();
  return row;
}

export async function attachInvoiceLink(orderId: number, invoiceLink: string) {
  await db.update(orders).set({ invoiceLink }).where(eq(orders.id, orderId));
}

export async function getOrderForUser(orderId: number, userId: number): Promise<OrderRow | null> {
  const [row] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function getOrderByPayload(payload: string): Promise<OrderRow | null> {
  const [row] = await db.select().from(orders).where(eq(orders.payload, payload)).limit(1);
  return row ?? null;
}

export async function getRecentOrdersForUser(userId: number, limit = 5): Promise<OrderRow[]> {
  return db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
}

const LICENSE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LICENSE_LENGTH = 12;
const LICENSE_PREFIX = "ESPA";

/**
 * The key format is intentionally identical to the offline check in
 * `src/lib/license.ts`, so a key bought with Stars keeps validating locally
 * (and can be restored on any device straight from the local storage).
 */
function licenseChecksum(clean: string): number {
  let sum = 0;
  for (let i = 0; i < clean.length; i++) {
    const index = LICENSE_ALPHABET.indexOf(clean[i]);
    if (index < 0) return -1;
    sum += (i + 1) * (index + 1);
  }
  return sum % 7;
}

export function generateLicenseKey(): string {
  const chars = LICENSE_PREFIX.split("");
  while (chars.length < LICENSE_LENGTH - 1) {
    chars.push(LICENSE_ALPHABET[randomBytes(1)[0] % LICENSE_ALPHABET.length]);
  }
  // Solve the final character so the checksum is ≡ 0 (mod 7).
  for (const candidate of LICENSE_ALPHABET) {
    const attempt = [...chars, candidate].join("");
    if (licenseChecksum(attempt) === 0) {
      return (attempt.match(/.{1,4}/g) ?? []).join("-");
    }
  }
  // Unreachable: 32 candidates always cover all 7 residues.
  throw new Error("failed to generate a valid license key");
}

export async function issueLicenseForOrder(order: OrderRow): Promise<LicenseRow> {
  const [existing] = await db
    .select()
    .from(licenses)
    .where(eq(licenses.orderId, order.id))
    .limit(1);
  if (existing) return existing;

  for (let attempt = 0; attempt < 5; attempt++) {
    const key = generateLicenseKey();
    try {
      const [row] = await db
        .insert(licenses)
        .values({
          key,
          userId: order.userId,
          orderId: order.id,
          productId: order.productId,
          source: "telegram_stars",
        })
        .returning();
      return row;
    } catch {
      // Extremely unlikely key collision — regenerate.
    }
  }
  throw new Error("could not issue a license key");
}

export interface FulfilledOrder {
  order: OrderRow;
  license: LicenseRow;
}

/** Marks an order as paid and guarantees exactly one license per order. */
export async function fulfillOrder(orderId: number, chargeId: string | null): Promise<FulfilledOrder | null> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return null;

  if (order.status !== "paid") {
    const [updated] = await db
      .update(orders)
      .set({ status: "paid", chargeId, paidAt: new Date() })
      .where(and(eq(orders.id, orderId), ne(orders.status, "paid")))
      .returning();
    const finalOrder = updated ?? order;
    const license = await issueLicenseForOrder(finalOrder);
    return { order: finalOrder, license };
  }

  const license = await issueLicenseForOrder(order);
  return { order, license };
}

export async function getLicenseByKey(key: string): Promise<LicenseRow | null> {
  const [row] = await db.select().from(licenses).where(eq(licenses.key, key)).limit(1);
  return row ?? null;
}

export async function markLicenseActivated(key: string) {
  await db.update(licenses).set({ activatedAt: new Date() }).where(eq(licenses.key, key));
}

export async function findPaidLicenseForUser(userId: number): Promise<LicenseRow | null> {
  const [row] = await db
    .select()
    .from(licenses)
    .where(eq(licenses.userId, userId))
    .orderBy(desc(licenses.issuedAt))
    .limit(1);
  return row ?? null;
}

const STARS_LOOKUP_WINDOW_MS = 15 * 60 * 1000;

/**
 * Fallback payment verification used when the bot webhook is not reachable.
 *
 * `getStarTransactions` returns incoming payments with the transaction id equal
 * to `SuccessfulPayment.telegram_payment_charge_id`, and (when available) the
 * invoice payload inside `source`. We match on the payload first and fall back
 * to amount + date window + buyer id.
 */
export async function verifyOrderThroughStarsHistory(
  order: OrderRow,
  telegramId: number,
): Promise<{ paid: boolean; chargeId: string | null; transaction: TgStarTransaction | null }> {
  let history;
  try {
    const result = await getStarTransactions(0, 100);
    history = result.star_transactions ?? [];
  } catch {
    return { paid: false, chargeId: null, transaction: null };
  }

  const createdMs = new Date(order.createdAt).getTime();
  const candidates = history.filter((transaction) => {
    if (transaction.amount !== order.stars) return false;
    if (!transaction.source) return false;
    const dateMs = transaction.date * 1000;
    return dateMs >= createdMs - STARS_LOOKUP_WINDOW_MS && dateMs <= Date.now() + 60_000;
  });

  const byPayload = candidates.find(
    (transaction) => transaction.source?.invoice_payload === order.payload,
  );
  const byUser = candidates.find(
    (transaction) => transaction.source?.user?.id === telegramId && !transaction.source?.invoice_payload,
  );
  const transaction = byPayload ?? byUser ?? null;

  if (!transaction) return { paid: false, chargeId: null, transaction: null };

  // Guard against double-spending the same transaction across orders.
  const [existing] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.chargeId, transaction.id), ne(orders.id, order.id)))
    .limit(1);
  if (existing) return { paid: false, chargeId: null, transaction: null };

  return { paid: true, chargeId: transaction.id, transaction };
}

export async function countPaidOrders(): Promise<number> {
  const rows = await db
    .select({ id: orders.id, userId: orders.userId })
    .from(orders)
    .innerJoin(telegramUsers, eq(orders.userId, telegramUsers.id))
    .where(eq(orders.status, "paid"));
  return rows.length;
}
