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
import { achievementsConfig, courseConfig } from "@/lib/content/config";
import type { LessonMeta } from "@/lib/content/types";
import { reduce } from "@/lib/progress/reducer";
import { computeStats, hasAccess, isPremium } from "@/lib/progress/selectors";
import { loadState, saveState } from "@/lib/progress/storage";
import { defaultState, type ProgressEvent, type ProgressState } from "@/lib/progress/types";

interface ProgressContextValue {
  ready: boolean;
  state: ProgressState;
  metas: LessonMeta[];
  dispatch: (event: ProgressEvent) => void;
  premium: boolean;
  access: (lesson: number) => boolean;
  newAchievements: string[];
  clearAchievement: (id: string) => void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({
  metas,
  children,
}: {
  metas: LessonMeta[];
  children: ReactNode;
}) {
  const [state, setState] = useState<ProgressState>(() =>
    defaultState(courseConfig.hearts.enabled, courseConfig.hearts.max),
  );
  const [ready, setReady] = useState(false);
  const [newAchievements, setNewAchievements] = useState<string[]>([]);
  const ref = useRef<ProgressState>(state);

  useEffect(() => {
    const loaded = loadState();
    if (loaded) {
      ref.current = loaded;
      setState(loaded);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveState(state);
  }, [state, ready]);

  // Detect freshly unlocked achievements to show them as toasts.
  useEffect(() => {
    const previous = ref.current.achievements;
    const next = state.achievements;
    const fresh = Object.keys(next).filter((id) => !previous[id]);
    ref.current = state;
    if (fresh.length > 0) setNewAchievements((current) => [...current, ...fresh]);
  }, [state]);

  // Theme: light / dark / system on <html>
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = state.settings.theme === "dark" || (state.settings.theme === "system" && media.matches);
      root.classList.toggle("dark", dark);
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [state.settings.theme]);

  const dispatch = useCallback(
    (event: ProgressEvent) => setState((previous) => reduce(previous, event, metas)),
    [metas],
  );

  const clearAchievement = useCallback((id: string) => {
    setNewAchievements((current) => current.filter((item) => item !== id));
  }, []);

  const value = useMemo<ProgressContextValue>(
    () => ({
      ready,
      state,
      metas,
      dispatch,
      premium: isPremium(state),
      access: (lesson: number) => hasAccess(state, lesson),
      newAchievements,
      clearAchievement,
    }),
    [ready, state, metas, dispatch, newAchievements, clearAchievement],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) throw new Error("useProgress must be used inside ProgressProvider");
  return context;
}

export function useStats() {
  const { state, metas } = useProgress();
  return useMemo(() => computeStats(state, metas), [state, metas]);
}

export function achievementById(id: string) {
  return achievementsConfig.find((achievement) => achievement.id === id);
}
