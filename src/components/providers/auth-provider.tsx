"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useProgress } from "./progress-provider";
import { isMiniApp, prepareMiniApp } from "@/lib/telegram/webapp";

export interface AccountUser {
  telegramId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  languageCode: string | null;
  isTelegramPremium: boolean;
}

export interface AccountState {
  ok: true;
  configured: boolean;
  botUsername: string | null;
  starsPrice: number;
  productId: string;
  user: AccountUser | null;
  displayName: string | null;
  premium: {
    active: boolean;
    key: string | null;
    productId: string | null;
    source: string | null;
    issuedAt: string | null;
  };
  orders: { id: number; status: string; stars: number; createdAt: string }[];
}

interface AuthContextValue {
  /** "loading" while checking, "server" when the API is reachable, "local" when offline/static. */
  status: "loading" | "server" | "local";
  account: AccountState | null;
  user: AccountUser | null;
  botUsername: string | null;
  starsPrice: number;
  serverPremium: boolean;
  miniApp: boolean;
  authenticating: boolean;
  error: string | null;
  loginWithWidgetData: (data: Record<string, unknown>) => Promise<boolean>;
  loginWithInitData: (initData: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const FALLBACK_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? null;
const FALLBACK_STARS = Number(process.env.NEXT_PUBLIC_STARS_PRICE ?? 500) || 500;

function fallbackAccount(): AccountState {
  return {
    ok: true,
    configured: Boolean(FALLBACK_BOT_USERNAME),
    botUsername: FALLBACK_BOT_USERNAME,
    starsPrice: FALLBACK_STARS,
    productId: "premium-45",
    user: null,
    displayName: null,
    premium: { active: false, key: null, productId: null, source: null, issuedAt: null },
    orders: [],
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useProgress();
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const [account, setAccount] = useState<AccountState | null>(null);
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [miniApp, setMiniApp] = useState(false);
  const syncedRef = useRef<string | null>(null);

  const applyAccount = useCallback((payload: AccountState) => {
    setAccount(payload);
    setStatus("server");
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/telegram/session", { cache: "no-store" });
      if (!response.ok) throw new Error(`status ${response.status}`);
      const payload = (await response.json()) as AccountState;
      applyAccount(payload);
    } catch {
      // Static export or offline: the trainer keeps working locally.
      setAccount(fallbackAccount());
      setStatus("local");
    }
  }, [applyAccount]);

  const loginWithInitData = useCallback(
    async (initData: string) => {
      setAuthenticating(true);
      setError(null);
      try {
        const response = await fetch("/api/telegram/auth/init", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ initData }),
        });
        const payload = (await response.json()) as AccountState & { error?: string };
        if (!response.ok) {
          setError(payload.error ?? "Не удалось войти через Telegram.");
          return false;
        }
        applyAccount(payload);
        return true;
      } catch (caught) {
        setError((caught as Error).message);
        return false;
      } finally {
        setAuthenticating(false);
      }
    },
    [applyAccount],
  );

  const loginWithWidgetData = useCallback(
    async (data: Record<string, unknown>) => {
      setAuthenticating(true);
      setError(null);
      try {
        const response = await fetch("/api/telegram/auth", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(data),
        });
        const payload = (await response.json()) as AccountState & { error?: string };
        if (!response.ok) {
          setError(payload.error ?? "Не удалось войти через Telegram.");
          return false;
        }
        applyAccount(payload);
        return true;
      } catch (caught) {
        setError((caught as Error).message);
        return false;
      } finally {
        setAuthenticating(false);
      }
    },
    [applyAccount],
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/telegram/auth", { method: "DELETE" });
    } catch {
      /* local mode */
    }
    setAccount((current) => (current ? { ...current, user: null, displayName: null, orders: [] } : current));
    await refresh();
  }, [refresh]);

  // Initial load + Mini App auto-login.
  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      const app = isMiniApp() ? prepareMiniApp() : null;
      if (!cancelled) setMiniApp(Boolean(app));
      if (app?.initData) {
        const ok = await loginWithInitData(app.initData);
        if (ok || !cancelled) return;
      }
      await refresh();
    };
    void boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore a purchase: a server-confirmed license unlocks the local trainer.
  useEffect(() => {
    const key = account?.premium.key;
    if (!key) return;
    if (state.license?.key === key) return;
    if (syncedRef.current === key) return;
    syncedRef.current = key;
    dispatch({ type: "activate", key });
  }, [account?.premium.key, dispatch, state.license?.key]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      account,
      user: account?.user ?? null,
      botUsername: account?.botUsername ?? FALLBACK_BOT_USERNAME,
      starsPrice: account?.starsPrice ?? FALLBACK_STARS,
      serverPremium: Boolean(account?.premium.active),
      miniApp,
      authenticating,
      error,
      loginWithWidgetData,
      loginWithInitData,
      logout,
      refresh,
    }),
    [
      account,
      authenticating,
      error,
      loginWithInitData,
      loginWithWidgetData,
      logout,
      miniApp,
      refresh,
      status,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
