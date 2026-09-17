import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { telegramUsers, type TelegramUserRow } from "@/db/schema";
import { telegramIdFromRequest } from "@/lib/session";
import { getUserByTelegramId } from "@/server/users";

export function jsonResponse(data: unknown, status = 200): NextResponse {
  const response = NextResponse.json(data, { status });
  response.headers.set("cache-control", "no-store");
  return response;
}

export function errorResponse(message: string, status = 400): NextResponse {
  return jsonResponse({ ok: false, error: message }, status);
}

export async function readJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

/** Current signed-in account, or null. */
export async function currentUser(request: NextRequest): Promise<TelegramUserRow | null> {
  const telegramId = telegramIdFromRequest(request);
  if (telegramId === null) return null;
  try {
    return await getUserByTelegramId(telegramId);
  } catch {
    return null;
  }
}

export async function touchUser(id: number) {
  try {
    await db
      .update(telegramUsers)
      .set({ lastAuthAt: new Date() })
      .where(eq(telegramUsers.id, id));
  } catch {
    /* non-critical */
  }
}

export function siteOrigin(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    return `${forwardedProto ?? "https"}://${forwardedHost}`;
  }
  return new URL(request.url).origin;
}

export function adminSecretOk(request: NextRequest): boolean {
  const expected = process.env.ADMIN_SECRET ?? process.env.TELEGRAM_BOT_TOKEN;
  if (!expected) return false;
  const provided =
    request.headers.get("x-admin-secret") ??
    new URL(request.url).searchParams.get("secret") ??
    "";
  return provided === expected;
}
