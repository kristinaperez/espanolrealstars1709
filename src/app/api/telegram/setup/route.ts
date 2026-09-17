import type { NextRequest } from "next/server";
import { getMe, getWebhookInfo, isBotConfigured, setWebhook } from "@/lib/telegram/bot-api";
import { getBotUsername } from "@/lib/telegram/crypto";
import { adminSecretOk, errorResponse, jsonResponse, siteOrigin } from "@/server/http";

export const dynamic = "force-dynamic";

/**
 * GET /api/telegram/setup?secret=ADMIN_SECRET
 *
 * One-time helper that registers the payment webhook for the bot.
 * After that Telegram confirms Stars payments automatically.
 */
export async function GET(request: NextRequest) {
  try {
    const { db } = await import("@/db");
    await db.execute(await (await import("drizzle-orm")).sql`select 1`);
  } catch {
    return errorResponse("Server persistence is unavailable. The offline trainer continues to work.", 503);
  }

  if (!isBotConfigured()) {
    return errorResponse("TELEGRAM_BOT_TOKEN не задан.", 503);
  }
  if (!adminSecretOk(request)) {
    return errorResponse("Неверный секрет администратора.", 403);
  }

  const origin = siteOrigin(request);
  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL ?? `${origin}/api/telegram/webhook`;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET ?? undefined;

  try {
    const me = await getMe();
    const registered = await setWebhook(webhookUrl, secret);
    const info = await getWebhookInfo();
    return jsonResponse({
      ok: true,
      bot: { username: me.username, id: me.id },
      configuredBotUsername: getBotUsername(),
      webhookUrl,
      registered,
      webhookInfo: info,
      loginWidgetUrl: `${origin}/learn/settings`,
      note: "Добавьте этот домен в BotFather (/setdomain), чтобы работала кнопка входа через Telegram.",
    });
  } catch (error) {
    return errorResponse(`Не удалось настроить вебхук: ${(error as Error).message}`, 502);
  }
}
