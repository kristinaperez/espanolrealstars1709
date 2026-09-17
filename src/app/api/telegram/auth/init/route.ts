import type { NextRequest } from "next/server";
import { verifyInitData } from "@/lib/telegram/crypto";
import { setSessionCookie } from "@/lib/session";
import { errorResponse, jsonResponse, readJsonBody } from "@/server/http";
import { buildAccountPayload } from "@/server/account";
import { upsertTelegramUser } from "@/server/users";

export const dynamic = "force-dynamic";

/**
 * POST — Mini App login.
 * The client sends the raw `Telegram.WebApp.initData` string; the signature is
 * verified server-side with the bot token before any session is created.
 */
export async function POST(request: NextRequest) {
  try {
    const { db } = await import("@/db");
    await db.execute(await (await import("drizzle-orm")).sql`select 1`);
  } catch {
    return errorResponse("Server persistence is unavailable. The offline trainer continues to work.", 503);
  }

  const body = await readJsonBody<{ initData?: string }>(request);
  const initData = body?.initData;
  if (!initData) return errorResponse("initData is required");

  const verified = verifyInitData(initData);
  if (!verified) {
    return errorResponse("Не удалось подтвердить данные Telegram Mini App.", 401);
  }

  try {
    const user = await upsertTelegramUser(verified.user);
    const response = jsonResponse(await buildAccountPayload(user));
    setSessionCookie(response, user.telegramId);
    return response;
  } catch (error) {
    return errorResponse(`Ошибка сохранения профиля: ${(error as Error).message}`, 500);
  }
}
