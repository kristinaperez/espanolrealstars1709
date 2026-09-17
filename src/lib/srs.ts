import { daysBetween, dateKey, addDays } from "@/lib/utils";

export interface SrsState {
  /** 0 = new, then 1..n along the interval ladder */
  step: number;
  due: string | null;
  lapses: number;
  correct: number;
  wrong: number;
  lastResult: "correct" | "wrong" | null;
}

export function emptySrs(): SrsState {
  return { step: 0, due: null, lapses: 0, correct: 0, wrong: 0, lastResult: null };
}

export const SRS_INTERVALS = [1, 3, 7, 30, 90];

export function isDue(state: SrsState, today = dateKey()): boolean {
  if (!state.due) return state.step === 0;
  return daysBetween(today, state.due) <= 0;
}

export function advance(state: SrsState, correct: boolean, today = dateKey()): SrsState {
  const next: SrsState = {
    ...state,
    correct: state.correct + (correct ? 1 : 0),
    wrong: state.wrong + (correct ? 0 : 1),
    lastResult: correct ? "correct" : "wrong",
  };

  if (!correct) {
    // A mistake restarts the ladder and schedules a short-term review.
    next.lapses = state.lapses + 1;
    next.step = 1;
    next.due = addDays(today, SRS_INTERVALS[0]);
    return next;
  }

  const nextStep = Math.min(state.step + 1, SRS_INTERVALS.length);
  next.step = nextStep;
  const interval = SRS_INTERVALS[Math.min(Math.max(nextStep - 1, 0), SRS_INTERVALS.length - 1)];
  next.due = addDays(today, interval);
  return next;
}

export function dueCount(states: Record<string, SrsState>, today = dateKey()): number {
  let count = 0;
  for (const state of Object.values(states)) {
    if (isDue(state, today)) count += 1;
  }
  return count;
}

export function nextDueDate(states: Record<string, SrsState>): string | null {
  const dates = Object.values(states)
    .map((state) => state.due)
    .filter((value): value is string => Boolean(value))
    .sort();
  return dates[0] ?? null;
}

/** Unique, stable id for a phrase across the whole course. */
export function phraseId(lesson: number, index: number): string {
  return `${lesson}:${index}`;
}
