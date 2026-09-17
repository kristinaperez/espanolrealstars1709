import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

const globalForPool = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

let poolInstance: Pool;
let dbInstance: ReturnType<typeof drizzle>;

if (!databaseUrl) {
  // Graceful degradation: when DATABASE_URL is absent, the offline trainer,
  // license-key activation and static export keep working. Server-side
  // persistence (Telegram login, Stars payments, webhook fulfillment) is disabled.
  const noopPool = {
    connect: async () => ({ release: () => {} }),
    on: () => {},
    end: async () => {},
  } as unknown as Pool;
  poolInstance = noopPool;
  dbInstance = drizzle(noopPool);
  if (typeof console !== "undefined" && (process.env.NODE_ENV !== "production" || process.env.DEBUG === "1")) {
    console.warn(
      "[database] DATABASE_URL is not configured. Server-side persistence (Telegram login, Stars payments, webhook fulfillment) is disabled; the offline trainer continues to work without interruption.",
    );
  }
} else {
  const realPool =
    globalForPool.__arenaNextJsPostgresqlPool ??
    new Pool({ connectionString: databaseUrl });

  if (process.env.NODE_ENV !== "production") {
    globalForPool.__arenaNextJsPostgresqlPool = realPool;
  }
  poolInstance = realPool;
  dbInstance = drizzle(realPool);
}

export const pool = poolInstance;
export const db = dbInstance;
