import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

/**
 * Stateless signed-cookie session.
 *
 * The token is `base64url(payload).base64url(HMAC(payload))`, so no session
 * table is needed and the check is a single HMAC verification.
 */

export const SESSION_COOKIE = "er_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function sessionSecret(): string {
  return (
    process.env.SESSION_SECRET ??
    process.env.TELEGRAM_BOT_TOKEN ??
    "espanol-real-development-secret"
  );
}

interface SessionPayload {
  tid: number;
  exp: number;
}

function sign(value: string): string {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export function createSessionToken(telegramId: number): string {
  const payload: SessionPayload = {
    tid: telegramId,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function readSessionToken(token: string | undefined | null): number | null {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  if (!safeEqual(sign(encoded), signature)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.tid !== "number" || typeof payload.exp !== "number") return null;
    if (payload.exp < Date.now()) return null;
    return payload.tid;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAge: number = SESSION_MAX_AGE) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function telegramIdFromRequest(request: NextRequest): number | null {
  return readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}

export function setSessionCookie(response: NextResponse, telegramId: number) {
  response.cookies.set(SESSION_COOKIE, createSessionToken(telegramId), sessionCookieOptions());
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
}
