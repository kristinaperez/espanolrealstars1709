/**
 * Override with TELEGRAM_API_URL to target a self-hosted Bot API server
 * (or a local mock in tests). Defaults to the official Telegram endpoint.
 */
const API_ROOT = (process.env.TELEGRAM_API_URL ?? "https://api.telegram.org").replace(/\/$/, "");

export interface TgOk<T> {
  ok: true;
  result: T;
}
export interface TgError {
  ok: false;
  description: string;
  error_code?: number;
}
export type TgResponse<T> = TgOk<T> | TgError;

export interface TgUser {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TgLabeledPrice {
  label: string;
  amount: number;
}

export interface TgPreCheckoutQuery {
  id: string;
  from: TgUser;
  currency: string;
  total_amount: number;
  invoice_payload: string;
}

export interface TgSuccessfulPayment {
  currency: string;
  total_amount: number;
  invoice_payload: string;
  telegram_payment_charge_id: string;
  provider_payment_charge_id?: string;
}

export interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat?: { id: number };
  date?: number;
  successful_payment?: TgSuccessfulPayment;
  text?: string;
}

export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  pre_checkout_query?: TgPreCheckoutQuery;
}

export interface TgStarTransactionPartner {
  type: string;
  user?: TgUser;
  invoice_payload?: string;
}

export interface TgStarTransaction {
  id: string;
  amount: number;
  nanos?: number;
  date: number;
  source?: TgStarTransactionPartner;
  receiver?: TgStarTransactionPartner;
}

export interface TgStarTransactions {
  star_transactions: TgStarTransaction[];
}

export interface TgWebhookInfo {
  url?: string;
  pending_update_count?: number;
  last_error_message?: string;
}

export class TelegramBotError extends Error {
  constructor(
    message: string,
    readonly code?: number,
  ) {
    super(message);
    this.name = "TelegramBotError";
  }
}

async function call<T>(
  token: string,
  method: string,
  payload?: Record<string, unknown>,
): Promise<T> {
  let response: globalThis.Response;
  try {
    response = await fetch(`${API_ROOT}/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload ?? {}),
      cache: "no-store",
    });
  } catch (error) {
    throw new TelegramBotError(
      `Network error calling Telegram ${method}: ${(error as Error).message}`,
    );
  }

  let body: TgResponse<T> | null = null;
  try {
    body = (await response.json()) as TgResponse<T>;
  } catch {
    body = null;
  }

  if (!body) {
    throw new TelegramBotError(`Telegram ${method} returned a non-JSON response (${response.status})`);
  }
  if (!body.ok) {
    throw new TelegramBotError(`Telegram ${method} failed: ${body.description}`, body.error_code);
  }
  return body.result;
}

export function requireBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token.trim().length < 10) {
    throw new TelegramBotError(
      "TELEGRAM_BOT_TOKEN is not configured. Add it to the environment to enable Telegram login and Stars payments.",
    );
  }
  return token.trim();
}

export function isBotConfigured(): boolean {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  return Boolean(token && token.trim().length >= 10);
}

export async function getMe(): Promise<TgUser> {
  return call<TgUser>(requireBotToken(), "getMe");
}

export async function getBotUsernameFromApi(): Promise<string | null> {
  const me = await getMe();
  return me.username ?? null;
}

export interface StarsInvoiceInput {
  title: string;
  description: string;
  payload: string;
  stars: number;
  photoUrl?: string;
}

/**
 * Creates an invoice link for a Telegram Stars (XTR) payment.
 *
 * `provider_token` must be empty / omitted for Stars. Older Bot API versions
 * required omission, newer ones accept an empty string — so we send an empty
 * string and transparently retry without the field if Telegram complains.
 */
export async function createStarsInvoiceLink(input: StarsInvoiceInput): Promise<string> {
  const token = requireBotToken();
  const base: Record<string, unknown> = {
    title: input.title.slice(0, 32),
    description: input.description.slice(0, 255),
    payload: input.payload.slice(0, 128),
    currency: "XTR",
    // Exactly one price item is allowed for Stars payments.
    prices: [{ label: input.title.slice(0, 32), amount: Math.max(1, Math.round(input.stars)) }] satisfies
      TgLabeledPrice[],
  };
  if (input.photoUrl) {
    base.photo_url = input.photoUrl;
    base.photo_width = 1200;
    base.photo_height = 630;
  }

  try {
    return await call<string>(token, "createInvoiceLink", { ...base, provider_token: "" });
  } catch (error) {
    const message = (error as Error).message ?? "";
    if (message.toLowerCase().includes("provider_token")) {
      return await call<string>(token, "createInvoiceLink", base);
    }
    throw error;
  }
}

export async function answerPreCheckoutQuery(id: string, ok: boolean, errorMessage?: string) {
  return call<boolean>(requireBotToken(), "answerPreCheckoutQuery", {
    pre_checkout_query_id: id,
    allow: ok,
    ...(ok ? {} : { error_message: errorMessage ?? "Payment could not be processed." }),
  });
}

export async function getStarTransactions(offset = 0, limit = 100): Promise<TgStarTransactions> {
  return call<TgStarTransactions>(requireBotToken(), "getStarTransactions", {
    offset,
    limit: Math.min(Math.max(limit, 1), 100),
  });
}

export async function refundStarPayment(userId: number, chargeId: string) {
  return call<boolean>(requireBotToken(), "refundStarPayment", {
    user_id: userId,
    telegram_payment_charge_id: chargeId,
  });
}

export async function setWebhook(url: string, secretToken?: string) {
  return call<boolean>(requireBotToken(), "setWebhook", {
    url,
    ...(secretToken ? { secret_token: secretToken } : {}),
    allowed_updates: ["message", "pre_checkout_query"],
    drop_pending_updates: false,
  });
}

export async function getWebhookInfo(): Promise<TgWebhookInfo> {
  return call<TgWebhookInfo>(requireBotToken(), "getWebhookInfo");
}

export async function sendMessage(chatId: number, text: string) {
  return call<TgMessage>(requireBotToken(), "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  });
}
