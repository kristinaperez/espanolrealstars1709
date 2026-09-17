import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Server-side verification of Telegram identity data.
 *
 * Two flavours are supported with the same algorithm:
 *  1. Login Widget  — flat fields (id, first_name, ..., auth_date, hash)
 *  2. Mini App      — initData string (user=<json>&auth_date=...&hash=...)
 *
 * Both are signed with HMAC-SHA256 where the key is SHA256(bot_token).
 * The bot token never leaves the server.
 */

export interface TelegramAuthUser {
  id: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  languageCode?: string;
  isPremium?: boolean;
}

export function getBotToken(): string | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  return token && token.trim().length > 10 ? token.trim() : null;
}

export function getBotUsername(): string | null {
  const username = process.env.TELEGRAM_BOT_USERNAME ?? process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  return username ? username.replace(/^@/, "").trim() : null;
}

export function isTelegramConfigured(): boolean {
  return getBotToken() !== null;
}

function dataCheckString(entries: Record<string, string>): string {
  return Object.keys(entries)
    .filter((key) => key !== "hash" && key !== "signature")
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map((key) => `${key}=${entries[key]}`)
    .join("\n");
}

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export function maxAuthAgeSeconds(): number {
  const raw = Number(process.env.TELEGRAM_AUTH_MAX_AGE);
  return Number.isFinite(raw) && raw > 0 ? raw : 86_400;
}

/**
 * Verifies raw key/value pairs coming from Telegram.
 * Returns the verified user, or null when the signature or freshness check fails.
 */
export function verifyTelegramAuth(
  entries: Record<string, string>,
): { user: TelegramAuthUser; authDate: number } | null {
  const token = getBotToken();
  const hash = entries.hash;
  if (!token || !hash) return null;

  const secret = createHash("sha256").update(token).digest();
  const expected = createHmac("sha256", secret).update(dataCheckString(entries)).digest("hex");
  if (!safeEqual(expected, hash)) return null;

  const authDate = Number(entries.auth_date ?? 0);
  if (!Number.isFinite(authDate) || authDate <= 0) return null;
  const age = Math.floor(Date.now() / 1000) - authDate;
  if (age > maxAuthAgeSeconds() || age < -300) return null;

  let user: TelegramAuthUser | null = null;

  if (entries.user) {
    try {
      // Telegram sends snake_case keys here.
      const parsed = JSON.parse(entries.user) as Record<string, unknown>;
      const id = Number(parsed.id);
      if (Number.isFinite(id)) {
        user = {
          id,
          firstName: typeof parsed.first_name === "string" ? parsed.first_name : undefined,
          lastName: typeof parsed.last_name === "string" ? parsed.last_name : undefined,
          username: typeof parsed.username === "string" ? parsed.username : undefined,
          photoUrl: typeof parsed.photo_url === "string" ? parsed.photo_url : undefined,
          languageCode: typeof parsed.language_code === "string" ? parsed.language_code : undefined,
          isPremium: parsed.is_premium === true,
        };
      }
    } catch {
      user = null;
    }
  }

  if (!user && entries.id) {
    const id = Number(entries.id);
    if (Number.isFinite(id)) {
      user = {
        id,
        firstName: entries.first_name,
        lastName: entries.last_name,
        username: entries.username,
        photoUrl: entries.photo_url,
        languageCode: entries.language_code,
        isPremium: entries.is_premium === "true",
      };
    }
  }

  return user ? { user, authDate } : null;
}

/** Parses a Mini App `initData` query string into raw key/value pairs. */
export function parseInitData(initData: string): Record<string, string> {
  const params = new URLSearchParams(initData);
  const entries: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    entries[key] = value;
  }
  return entries;
}

export function verifyInitData(initData: string): { user: TelegramAuthUser; authDate: number } | null {
  return verifyTelegramAuth(parseInitData(initData));
}

export function displayName(user: TelegramAuthUser): string {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || `id ${user.id}`;
}
