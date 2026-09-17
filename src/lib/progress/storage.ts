import { courseConfig } from "@/lib/content/config";
import { defaultState, STORAGE_KEY, type ProgressState } from "./types";

export function loadState(): ProgressState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    return migrate(parsed);
  } catch {
    return null;
  }
}

export function saveState(state: ProgressState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or disabled — the app keeps working in memory.
  }
}

export function clearState() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

/** Forward-compatible merge so future versions never lose user progress. */
export function migrate(partial: Partial<ProgressState>): ProgressState {
  const base = defaultState(courseConfig.hearts.enabled, courseConfig.hearts.max);
  return {
    ...base,
    ...partial,
    streak: { ...base.streak, ...(partial.streak ?? {}) },
    bonusClaimed: { ...base.bonusClaimed, ...(partial.bonusClaimed ?? {}) },
    totals: { ...base.totals, ...(partial.totals ?? {}) },
    settings: { ...base.settings, ...(partial.settings ?? {}) },
    hearts: { ...base.hearts, ...(partial.hearts ?? {}) },
    lessons: partial.lessons ?? {},
    phrases: partial.phrases ?? {},
    days: partial.days ?? {},
    exams: partial.exams ?? {},
    achievements: partial.achievements ?? {},
    license: partial.license ?? null,
  };
}

export function exportProgress(state: ProgressState): string {
  return JSON.stringify(state, null, 2);
}

export function importProgress(raw: string): ProgressState {
  const parsed = JSON.parse(raw) as Partial<ProgressState>;
  return migrate(parsed);
}
