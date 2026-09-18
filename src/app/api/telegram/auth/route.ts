import { NextResponse, type NextRequest } from "next/server";
import { verifyTelegramAuthDetailed, type TelegramAuthUser } from "@/lib/telegram/crypto";
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
    // The legacy widget sends a flat object. If a proxy/wrapper ever sends
    // the user object nested under `user`, normalize it to the same signed
    // fields before verification.
    if (key === "user" && typeof value === "object") {
      const nested = value as Record<string, unknown>;
      for (const [nestedKey, nestedValue] of Object.entries(nested)) {
        if (nestedValue !== null && nestedValue !== undefined && typeof nestedValue !== "object") {
          entries[nestedKey] = String(nestedValue);
        }
      }
      continue;
    }
    if (typeof value === "object") continue;
    entries[key] = String(value);
  }

  const verified = verifyTelegramAuthDetailed(entries);
  if (!verified.ok) {
    const messages: Record<typeof verified.reason, string> = {
      not_configured: "TELEGRAM_BOT_TOKEN не настроен на сервере.",
      missing_hash: "Telegram не передал подпись hash.",
      bad_hash: "Подпись Telegram не совпадает. Проверьте, что TELEGRAM_BOT_TOKEN относится к тому же боту, который указан в TELEGRAM_BOT_USERNAME и виден в кнопке входа.",
      bad_auth_date: "Telegram не передал корректную дату авторизации.",
      expired: "Данные авторизации Telegram устарели. Нажмите кнопку входа ещё раз.",
      missing_user: "Telegram не передал данные пользователя.",
    };
    return errorResponse(messages[verified.reason], 401);
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
 * Always redirect to the canonical domain (NEXT_PUBLIC_SITE_URL) so that
 * Netlify deploy-preview URLs never show up in the browser address bar.
 */
export async function GET(request: NextRequest) {
  // Resolve canonical origin: prefer NEXT_PUBLIC_SITE_URL to avoid deploy-preview URLs.
  const requestUrl = new URL(request.url);
  const canonicalOrigin =
    process.env.NEXT_PUBLIC_SITE_URL
      ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin
      : requestUrl.origin;

  try {
    const { db } = await import("@/db");
    await db.execute(await (await import("drizzle-orm")).sql`select 1`);
  } catch {
    const target = new URL("/learn/settings#premium", canonicalOrigin);
    target.searchParams.set("telegram", "error");
    return NextResponse.redirect(target);
  }

  const entries: Record<string, string> = {};
  for (const [key, value] of requestUrl.searchParams.entries()) {
    entries[key] = value;
  }

  const verified = verifyTelegramAuth(entries);
  const target = new URL("/learn/settings#premium", canonicalOrigin);

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
