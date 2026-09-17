#!/usr/bin/env node
/**
 * End-to-end check of the Telegram Stars purchase flow.
 *
 * Starts a local mock of the Telegram Bot API, points the running Next.js app
 * at it, then walks the real path: login → invoice → webhook → license.
 *
 *   node scripts/e2e-telegram-stars.mjs [baseUrl]
 *
 * Requires the app to be started with:
 *   TELEGRAM_BOT_TOKEN=7000000001:test-token-for-local-mock
 *   TELEGRAM_API_URL=http://127.0.0.1:4010
 */
import { createHash, createHmac, randomBytes } from "node:crypto";
import http from "node:http";

const BASE = process.argv[2] ?? "http://127.0.0.1:3100";
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "7000000001:test-token-for-local-mock";
const MOCK_PORT = Number(new URL(process.env.TELEGRAM_API_URL ?? "http://127.0.0.1:4010").port ?? 4010);

const TELEGRAM_ID = 7000000001;
const CREATED_INVOICES = [];

const log = (...args) => console.log(" ", ...args);
let failures = 0;
function check(label, condition, extra) {
  if (condition) {
    console.log(`  ✔ ${label}`);
  } else {
    failures += 1;
    console.log(`  ✘ ${label}${extra ? ` — ${JSON.stringify(extra).slice(0, 300)}` : ""}`);
  }
}

// ---------------------------------------------------------------- mock API
const mock = http.createServer((request, response) => {
  let body = "";
  request.on("data", (chunk) => (body += chunk));
  request.on("end", () => {
    const method = (request.url ?? "").replace(/^\/bot[^/]+\//, "");
    const payload = body ? JSON.parse(body) : {};
    let result;

    if (method === "getMe") {
      result = { id: 7000000001, username: "EspanolRealTestBot", first_name: "Test" };
    } else if (method === "createInvoiceLink") {
      const link = `https://t.me/\$${randomBytes(8).toString("hex")}`;
      CREATED_INVOICES.push({ payload: payload.payload, link, stars: payload.prices?.[0]?.amount });
      result = link;
    } else if (method === "getStarTransactions") {
      // Simulates a payment that Telegram already settled: the most recent
      // invoice is reported as an incoming Stars transaction with its payload.
      const invoice = CREATED_INVOICES[CREATED_INVOICES.length - 1];
      result = {
        star_transactions: invoice
          ? [
              {
                id: `charge-${randomBytes(6).toString("hex")}`,
                amount: invoice.stars,
                date: Math.floor(Date.now() / 1000),
                source: { type: "user", invoice_payload: invoice.payload, user: { id: TELEGRAM_ID } },
              },
            ]
          : [],
      };
    } else if (method === "setWebhook" || method === "answerPreCheckoutQuery") {
      result = true;
    } else if (method === "getWebhookInfo") {
      result = { url: "", pending_update_count: 0 };
    } else if (method === "sendMessage") {
      result = { message_id: 1 };
    } else {
      result = true;
    }

    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, result }));
  });
});

await new Promise((resolve) => mock.listen(MOCK_PORT, "127.0.0.1", resolve));

// ------------------------------------------------------------- login widget
function signedLoginWidgetData() {
  const data = {
    id: String(TELEGRAM_ID),
    first_name: "Irina",
    username: "irina_test",
    auth_date: String(Math.floor(Date.now() / 1000)),
  };
  const checkString = Object.keys(data)
    .sort()
    .map((key) => `${key}=${data[key]}`)
    .join("\n");
  data.hash = createHmac("sha256", createHash("sha256").update(BOT_TOKEN).digest())
    .update(checkString)
    .digest("hex");
  return data;
}

let cookie = "";
async function api(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
      ...(options.headers ?? {}),
    },
  });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: response.status, json };
}

console.log("\n▶ Telegram Stars — end-to-end flow\n");

// 1. Login
const login = await api("/api/telegram/auth", {
  method: "POST",
  body: JSON.stringify(signedLoginWidgetData()),
});
check("login returns 200", login.status === 200, login);
check("session cookie issued", cookie.startsWith("er_session="), cookie);
check("user stored", login.json?.user?.telegramId === TELEGRAM_ID, login.json?.user);

const session = await api("/api/telegram/session");
check("session endpoint sees the user", session.json?.user?.telegramId === TELEGRAM_ID, session.json);
check("stars price reported", session.json?.starsPrice === 500, session.json?.starsPrice);

// 2. Tampered payload must be rejected
const tampered = await api("/api/telegram/auth", {
  method: "POST",
  body: JSON.stringify({ ...signedLoginWidgetData(), id: "42" }),
});
check("tampered login rejected", tampered.status === 401, tampered);

// 3. Create the invoice
const invoice = await api("/api/payments/telegram/stars", {
  method: "POST",
  body: JSON.stringify({ productId: "premium-45" }),
});
check("invoice created", invoice.status === 200 && Boolean(invoice.json?.invoiceLink), invoice);
check("invoice is for 500 stars", invoice.json?.stars === 500, invoice.json?.stars);

// 4. Telegram confirms the payment through the webhook
const orderPayload = invoice.json?.payload;
const preCheckout = await api("/api/telegram/webhook", {
  method: "POST",
  body: JSON.stringify({
    update_id: 1,
    pre_checkout_query: {
      id: "pcq-1",
      from: { id: TELEGRAM_ID },
      currency: "XTR",
      total_amount: 500,
      invoice_payload: orderPayload,
    },
  }),
});
check("pre_checkout_query accepted", preCheckout.json?.ok === true, preCheckout);

const paid = await api("/api/telegram/webhook", {
  method: "POST",
  body: JSON.stringify({
    update_id: 2,
    message: {
      message_id: 10,
      from: { id: TELEGRAM_ID },
      chat: { id: TELEGRAM_ID },
      date: Math.floor(Date.now() / 1000),
      successful_payment: {
        currency: "XTR",
        total_amount: 500,
        invoice_payload: orderPayload,
        telegram_payment_charge_id: "charge-webhook-1",
      },
    },
  }),
});
check("successful_payment processed", paid.json?.handled === "successful_payment", paid);

// 5. Order status now carries a license key
const status = await api(`/api/payments/telegram/order?orderId=${invoice.json?.orderId}`);
check("order marked paid", status.json?.status === "paid", status);
const licenseKey = status.json?.license?.key;
check("license key issued", typeof licenseKey === "string" && /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(licenseKey), licenseKey);
check("license source recorded", status.json?.license?.source === "telegram_stars", status.json?.license);

// 6. The key must pass the offline checksum used by the client
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const clean = licenseKey.replace(/-/g, "");
let sum = 0;
for (let i = 0; i < clean.length; i++) sum += (i + 1) * (ALPHABET.indexOf(clean[i]) + 1);
check("key passes the offline client checksum", sum % 7 === 0, { clean, sum });

// 7. Server-side activation
const activate = await api("/api/licenses/activate", {
  method: "POST",
  body: JSON.stringify({ key: licenseKey.toLowerCase().replace(/-/g, "") }),
});
check("license activates (normalised input)", activate.json?.valid === true, activate);

// 8. A wrong key must not activate
const bad = await api("/api/licenses/activate", {
  method: "POST",
  body: JSON.stringify({ key: "ESPA-0000-0000" }),
});
check("unknown key rejected", bad.json?.valid === false, bad);

// 9. Session reports premium
const after = await api("/api/telegram/session");
check("session reports premium", after.json?.premium?.active === true, after.json?.premium);

// 10. Unknown order id
const missing = await api("/api/payments/telegram/order?orderId=999999");
check("unknown order → 404", missing.status === 404, missing);

// 11. Signed-out requests are rejected
const savedCookie = cookie;
cookie = "";
const anonymous = await api("/api/payments/telegram/stars", {
  method: "POST",
  body: JSON.stringify({ productId: "premium-45" }),
});
check("anonymous purchase blocked", anonymous.status === 401, anonymous);
cookie = savedCookie;

// ---------------------------------------------------------------- Mini App
console.log("\n▶ Telegram Mini App login\n");
const initDataParams = new URLSearchParams({
  user: JSON.stringify({ id: TELEGRAM_ID, first_name: "Marat", username: "marat_test", is_premium: true }),
  auth_date: String(Math.floor(Date.now() / 1000)),
});
const initDataCheck = [...initDataParams.entries()]
  .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  .map(([key, value]) => `${key}=${value}`)
  .join("\n");
initDataParams.set(
  "hash",
  createHmac("sha256", createHash("sha256").update(BOT_TOKEN).digest())
    .update(initDataCheck)
    .digest("hex"),
);

cookie = "";
const miniAppLogin = await api("/api/telegram/auth/init", {
  method: "POST",
  body: JSON.stringify({ initData: initDataParams.toString() }),
});
check("mini app login returns 200", miniAppLogin.status === 200, miniAppLogin);
check("mini app user stored", miniAppLogin.json?.user?.username === "marat_test", miniAppLogin.json?.user);

cookie = "";
const badInit = await api("/api/telegram/auth/init", {
  method: "POST",
  body: JSON.stringify({ initData: `${initDataParams.toString()}&extra=1` }),
});
check("forged initData rejected", badInit.status === 401, badInit);

cookie = savedCookie;

// -------------------------------------------- webhook-less verification path
console.log("\n▶ Fallback verification via getStarTransactions\n");
const fallbackInvoice = await api("/api/payments/telegram/stars", {
  method: "POST",
  body: JSON.stringify({ productId: "premium-45" }),
});
check("second invoice created", fallbackInvoice.status === 200, fallbackInvoice);

const fallback = await api(`/api/payments/telegram/order?orderId=${fallbackInvoice.json?.orderId}`);
check(
  "payment detected without a webhook",
  fallback.json?.status === "paid" && Boolean(fallback.json?.license?.key),
  fallback,
);
check(
  "verification source is the stars history",
  fallback.json?.verification === "stars-history",
  fallback.json?.verification,
);

// ------------------------------------------------ premium content gating
console.log("\n▶ Premium content gating\n");

const pageHtml = await (await fetch(`${BASE}/lesson/8`)).text();
// The page keeps a 2-phrase teaser for SEO; everything after it must be withheld.
check(
  "premium phrases beyond the teaser are absent from the HTML",
  !pageHtml.includes("La lavadora no funciona") &&
    !pageHtml.includes("Se ha atascado el desagüe") &&
    !pageHtml.includes("Necesito un técnico urgentemente") &&
    !pageHtml.includes("¿Quién paga la reparación?"),
);
check(
  "premium author commentary is withheld",
  !pageHtml.includes("В Испании поломку называют «avería»"),
);
check(
  "lesson metadata stays in the HTML for SEO",
  pageHtml.includes("Урок 8") && pageHtml.includes("Hay una avería"),
);
check(
  "teaser phrases are present for indexing",
  pageHtml.includes("Hay una avería en la cocina"),
);
check(
  "no distractor pool from other premium lessons in the HTML",
  !pageHtml.includes("La fianza son dos meses") && !pageHtml.includes("Quiero abrir una cuenta"),
);

const freeLesson = await fetch(`${BASE}/api/lessons/1`);
const freeJson = await freeLesson.json();
check("free lesson is public", freeLesson.status === 200 && freeJson?.lesson?.phrases?.length > 0, freeLesson.status);

const blocked = await fetch(`${BASE}/api/lessons/8`);
check("premium lesson blocked without entitlement", blocked.status === 402, blocked.status);

const withKey = await fetch(`${BASE}/api/lessons/8?key=${licenseKey}`);
const keyJson = await withKey.json();
check(
  "premium lesson served with a license key",
  withKey.status === 200 && keyJson?.lesson?.phrases?.length === 8,
  { status: withKey.status, phrases: keyJson?.lesson?.phrases?.length },
);

cookie = savedCookie;
const withSession = await api("/api/lessons/8");
check(
  "premium lesson served to a paid Telegram account",
  withSession.status === 200 && withSession.json?.lesson?.phrases?.length === 8,
  withSession.status,
);
check(
  "distractor pool is delivered with the lesson",
  Array.isArray(withSession.json?.pool) && withSession.json.pool.length > 0,
  withSession.json?.pool?.length,
);

cookie = "";
const anonymousLesson = await api("/api/lessons/8");
check("premium lesson blocked for anonymous users", anonymousLesson.status === 402, anonymousLesson.status);
cookie = savedCookie;

mock.close();
console.log(
  `\n${failures === 0 ? "✅ All checks passed" : `❌ ${failures} check(s) failed`}\n`,
);
process.exit(failures === 0 ? 0 : 1);
