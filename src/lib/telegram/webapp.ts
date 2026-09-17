"use client";

/**
 * Minimal, dependency-free typings + helpers for the Telegram Mini App bridge.
 * Everything degrades gracefully when the app runs in a normal browser tab.
 */

export interface TelegramWebAppUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
  is_premium?: boolean;
}

export type InvoiceStatus = "paid" | "cancelled" | "failed" | "pending";

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramWebAppUser;
    start_param?: string;
    auth_date?: number;
  };
  version: string;
  platform: string;
  colorScheme?: "light" | "dark";
  ready: () => void;
  expand: () => void;
  openInvoice: (url: string, callback?: (status: InvoiceStatus) => void) => void;
  showAlert?: (message: string) => void;
  HapticFeedback?: {
    impactOccurred?: (style: string) => void;
    notificationOccurred?: (type: string) => void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function getWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

export function isMiniApp(): boolean {
  const app = getWebApp();
  return Boolean(app && app.initData && app.initData.length > 0);
}

/** Boots the Mini App and returns it when the user can be authenticated. */
export function prepareMiniApp(): TelegramWebApp | null {
  const app = getWebApp();
  if (!app) return null;
  try {
    app.ready();
    app.expand();
  } catch {
    /* older clients */
  }
  return app;
}

/** Opens an invoice link in the best way the current client supports. */
export function openInvoiceLink(
  url: string,
  onStatus?: (status: InvoiceStatus) => void,
): "webapp" | "browser" {
  const app = getWebApp();
  if (app && typeof app.openInvoice === "function") {
    try {
      app.openInvoice(url, (status) => onStatus?.(status));
      return "webapp";
    } catch {
      /* fall through to the browser path */
    }
  }
  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
  return "browser";
}
