import { NextResponse, type NextRequest } from "next/server";
import { verifyTelegramAuth, type TelegramAuthUser } from "@/lib/telegram/crypto";
import { clearSessionCookie, setSessionCookie } from "@/lib/session";
import { currentUser, errorResponse, jsonResponse, readJsonBody } from "@/server/http";
import { buildAccountPayload } from "@/server/account";
import { upsertTelegramUser } from "@/server/users";

export const dynamic = "force-dynamic";

/**
 * POST — Telegram Login Widget callback (`data-onauth` posts the user object).
 */
export async function POST(request: NextRequest) {
  // Without DATABASE_URL server-side persistence is unavailable.
  try {
    const { db } = await import("@/db");
    await db.execute(await (await import("drizzle-orm")).sql`select 1`);
  } catch {
    return errorResponse("Telegram login requires DATABASE_URL to be configured.", 503);
  }
  const body = await readJsonBody<Record<string, unknown>>(request);
  if (!body || typeof body !== "object") return errorResponse("Invalid payload");

  const entries: Record<string, string> = {};
  for (const [key, value] of Object.entries(body)) {
    if (value === null || value === undefined) continue;
    if (typeof value === "object") continue;
    entries[key] = String(value);
  }

  const verified = verifyTelegramAuth(entries);
  if (!verified) {
    return errorResponse("Не удалось подтвердить данные Telegram. Попробуйте войти снова.", 401);
  }

  let user;
  try {
    user = await upsertTelegramUser(verified.user);
  } catch (error) {
    return errorResponse(`Ошибка сохранения профиля: ${(error as Error).message}`, 500);
  }

  const response = jsonResponse(await buildAccountPayload(user));
  setSessionCookie(response, user.telegramId);
  return response;
}

/**
 * GET — redirect flavour of the Login Widget (`data-auth-url`).
 * Telegram appends the signed fields to the query string.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const entries: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) {
    entries[key] = value;
  }

  const verified = verifyTelegramAuth(entries);
  const target = new URL("/learn/settings#premium", url.origin);

  if (!verified) {
    target.searchParams.set("telegram", "error");
    const response = NextResponse.redirect(target);
    clearSessionCookie(response);
    return response;
  }

  try {
    const user = await upsertTelegramUser(verified.user);
    target.searchParams.set("telegram", "ok");
    const response = NextResponse.redirect(target);
    setSessionCookie(response, user.telegramId);
    return response;
  } catch (error) {
    target.searchParams.set("telegram", "error");
    const response = NextResponse.redirect(target);
    clearSessionCookie(response);
    void error;
    return response;
  }
}

/** DELETE — sign out. */
export async function DELETE(request: NextRequest) {
  const response = jsonResponse({ ok: true, signedOut: true });
  clearSessionCookie(response);
  void currentUser(request);
  return response;
}

export type { TelegramAuthUser };
