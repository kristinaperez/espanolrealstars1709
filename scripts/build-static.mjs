#!/usr/bin/env node
/**
 * Static export build for the offline-only variant of Español Real.
 *
 * Telegram login and Stars payments need a server, so those API routes are
 * temporarily moved out of `src/app` for this build. The learning trainer,
 * content, progress and offline license-key activation keep working.
 *
 * Usage: node scripts/build-static.mjs
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const API_DIR = path.join(process.cwd(), "src", "app", "api");
const STASH = path.join(process.cwd(), ".telegram-api-stash");

function move(from, to) {
  if (!fs.existsSync(from)) return false;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.renameSync(from, to);
  return true;
}

// Recover from a previously interrupted run first.
if (fs.existsSync(STASH)) {
  if (fs.existsSync(API_DIR)) {
    console.error(`Both ${API_DIR} and ${STASH} exist — resolve manually.`);
    process.exit(1);
  }
  move(STASH, API_DIR);
}

try {
  const stashed = move(API_DIR, STASH);
  if (stashed) {
    console.log("• Moved src/app/api aside (server routes are not exportable).");
  }
  execSync("npx next build", {
    stdio: "inherit",
    env: { ...process.env, STATIC_EXPORT: "true" },
  });
} finally {
  if (fs.existsSync(STASH) && !fs.existsSync(API_DIR)) {
    move(STASH, API_DIR);
    console.log("• Restored src/app/api.");
  }
}
