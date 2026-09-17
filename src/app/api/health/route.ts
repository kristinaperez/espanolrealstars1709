import { db } from "@/db";
import { sql } from "drizzle-orm";

/**
 * Health endpoint.
 *
 * The app itself is 100% static (no server, no database) — this endpoint only
 * exists for platform monitoring and therefore renders statically, which keeps
 * `output: "export"` builds working on free static hosting.
 */
export const dynamic = "force-static";

export async function GET() {
  let database = false;
  try {
    await db.execute(sql`select 1`);
    database = true;
  } catch {
    database = false;
  }

  return Response.json({ ok: true, app: "espanol-real", database, static: true });
}
