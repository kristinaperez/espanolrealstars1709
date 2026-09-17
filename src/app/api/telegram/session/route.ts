import type { NextRequest } from "next/server";
import { jsonResponse } from "@/server/http";
import { errorResponse } from "@/server/http";
import { currentUser } from "@/server/http";
import { buildAccountPayload } from "@/server/account";

export const dynamic = "force-dynamic";

/** GET — current account, premium state and the Stars price. */
export async function GET(request: NextRequest) {
  try {
    const { db } = await import("@/db");
    await db.execute(await (await import("drizzle-orm")).sql`select 1`);
  } catch {
    return errorResponse("Server persistence is unavailable. The offline trainer continues to work.", 503);
  }

  const user = await currentUser(request);
  try {
    return jsonResponse(await buildAccountPayload(user));
  } catch {
    // Database unavailable — the app keeps working as a local/offline trainer.
    return jsonResponse(await buildAccountPayload(null));
  }
}
