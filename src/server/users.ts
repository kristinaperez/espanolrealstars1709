import { eq } from "drizzle-orm";
import { db } from "@/db";
import { telegramUsers, type TelegramUserRow } from "@/db/schema";
import type { TelegramAuthUser } from "@/lib/telegram/crypto";

export async function upsertTelegramUser(user: TelegramAuthUser): Promise<TelegramUserRow> {
  const values = {
    telegramId: user.id,
    username: user.username ?? null,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    photoUrl: user.photoUrl ?? null,
    languageCode: user.languageCode ?? null,
    isTelegramPremium: Boolean(user.isPremium),
    lastAuthAt: new Date(),
  };

  const [row] = await db
    .insert(telegramUsers)
    .values(values)
    .onConflictDoUpdate({
      target: telegramUsers.telegramId,
      set: {
        username: values.username,
        firstName: values.firstName,
        lastName: values.lastName,
        photoUrl: values.photoUrl,
        languageCode: values.languageCode,
        isTelegramPremium: values.isTelegramPremium,
        lastAuthAt: values.lastAuthAt,
      },
    })
    .returning();

  return row;
}

export async function getUserByTelegramId(telegramId: number): Promise<TelegramUserRow | null> {
  const [row] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.telegramId, telegramId))
    .limit(1);
  return row ?? null;
}

export async function getUserById(id: number): Promise<TelegramUserRow | null> {
  const [row] = await db.select().from(telegramUsers).where(eq(telegramUsers.id, id)).limit(1);
  return row ?? null;
}

export interface PublicUser {
  telegramId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  languageCode: string | null;
  isTelegramPremium: boolean;
}

export function toPublicUser(row: TelegramUserRow): PublicUser {
  return {
    telegramId: row.telegramId,
    username: row.username,
    firstName: row.firstName,
    lastName: row.lastName,
    photoUrl: row.photoUrl,
    languageCode: row.languageCode,
    isTelegramPremium: row.isTelegramPremium,
  };
}

export function publicDisplayName(user: PublicUser): string {
  return (
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    `id ${user.telegramId}`
  );
}
