import type { NextRequest } from "next/server";
import { formatKey, normalizeKey } from "@/lib/license";
import { errorResponse, jsonResponse, readJsonBody } from "@/server/http";
import { getLicenseByKey, markLicenseActivated } from "@/server/orders";

export const dynamic = "force-dynamic";

/**
 * POST { key } — authoritative license check.
 *
 * Keys bought with Telegram Stars are validated against the database so a
 * purchase can be restored on any device. The purely offline checksum check in
 * `src/lib/license.ts` remains as a fallback when the server is unreachable.
 */
export async function POST(request: NextRequest) {
  try {
    const { db } = await import("@/db");
    await db.execute(await (await import("drizzle-orm")).sql`select 1`);
  } catch {
    return errorResponse("Server persistence is unavailable. The offline trainer continues to work.", 503);
  }

  const body = await readJsonBody<{ key?: string }>(request);
  if (!body?.key) return errorResponse("key is required");

  const clean = normalizeKey(body.key);
  const formatted = formatKey(clean);
  const license = (await getLicenseByKey(formatted)) ?? (await getLicenseByKey(clean));

  if (!license) {
    return jsonResponse({ ok: true, valid: false, reason: "not-found" });
  }

  await markLicenseActivated(license.key);
  return jsonResponse({
    ok: true,
    valid: true,
    key: license.key,
    productId: license.productId,
    source: license.source,
    issuedAt: new Date(license.issuedAt).toISOString(),
  });
}
