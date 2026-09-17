import type { SrsState } from "@/lib/srs";

export type ThemeMode = "light" | "dark" | "system";

export interface Settings {
  theme: ThemeMode;
  sound: boolean;
  showTranslations: boolean;
  studentName: string;
  hearts: boolean;
}

export interface PhraseProgress extends SrsState {
  lesson: number;
  learned: boolean;
}

export interface LessonProgress {
  completed: boolean;
  completedAt: string | null;
  attempts: number;
  bestScore: number;
  bestTotal: number;
  perfect: boolean;
}

export interface DayLog {
  xp: number;
  correct: number;
  wrong: number;
  lessons: number;
  reviews: number;
}

export interface ProgressState {
  version: number;
  createdAt: string;
  xp: number;
  lessons: Record<string, LessonProgress>;
  phrases: Record<string, PhraseProgress>;
  days: Record<string, DayLog>;
  streak: { current: number; longest: number; lastActive: string | null };
  bonusClaimed: { streak5: string | null; dailyGoal: string | null };
  dailyGoal: number;
  combo: number;
  bestCombo: number;
  totals: {
    correct: number;
    wrong: number;
    reviews: number;
    exams: number;
    perfectLessons: number;
    flashcards: number;
  };
  exams: Record<string, { score: number; total: number; completedAt: string }>;
  achievements: Record<string, string>;
  license: { key: string; activatedAt: string } | null;
  settings: Settings;
  hearts: { count: number; updatedAt: string };
}

export type ProgressEvent =
  | { type: "answer"; lesson: number; phraseIndex: number; correct: boolean }
  | { type: "flashcard"; lesson: number; phraseIndex: number; reverse?: boolean }
  | { type: "lessonComplete"; lesson: number; correct: number; total: number }
  | { type: "examComplete"; block: number; correct: number; total: number }
  | { type: "reviewComplete"; correct: number; total: number }
  | { type: "setDailyGoal"; value: number }
  | { type: "setSettings"; patch: Partial<Settings> }
  | { type: "activate"; key: string }
  | { type: "deactivate" }
  | { type: "reset" }
  | { type: "touch" };

export const STORAGE_KEY = "espanol-real:progress:v1";

export function defaultState(heartsEnabled = false, maxHearts = 5): ProgressState {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    xp: 0,
    lessons: {},
    phrases: {},
    days: {},
    streak: { current: 0, longest: 0, lastActive: null },
    bonusClaimed: { streak5: null, dailyGoal: null },
    dailyGoal: 25,
    combo: 0,
    bestCombo: 0,
    totals: { correct: 0, wrong: 0, reviews: 0, exams: 0, perfectLessons: 0, flashcards: 0 },
    exams: {},
    achievements: {},
    license: null,
    settings: {
      theme: "system",
      sound: true,
      showTranslations: true,
      studentName: "",
      hearts: heartsEnabled,
    },
    hearts: { count: maxHearts, updatedAt: new Date().toISOString() },
  };
}
