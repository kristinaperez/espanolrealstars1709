import { courseConfig, milestones, xpTable } from "@/lib/content/config";
import type { LessonMeta } from "@/lib/content/types";
import { advance, emptySrs, phraseId } from "@/lib/srs";
import { addDays, dateKey, daysBetween } from "@/lib/utils";
import {
  defaultState,
  type ProgressEvent,
  type ProgressState,
  type Settings,
} from "./types";

const HEARTS = courseConfig.hearts;

function emptyLog() {
  return { xp: 0, correct: 0, wrong: 0, lessons: 0, reviews: 0 };
}

function todayLog(state: ProgressState, today: string) {
  return state.days[today] ?? emptyLog();
}

function regenHearts(state: ProgressState): ProgressState {
  if (!state.settings.hearts) return state;
  const now = Date.now();
  const updated = Date.parse(state.hearts.updatedAt);
  if (Number.isNaN(updated)) return state;
  const hours = (now - updated) / 3_600_000;
  const restored = Math.floor(hours / HEARTS.regenHours);
  if (restored <= 0 || state.hearts.count >= HEARTS.max) return state;
  const count = Math.min(HEARTS.max, state.hearts.count + restored);
  const spentToFull = restored - (count - state.hearts.count);
  const nextUpdate = new Date(updated + (spentToFull > 0 ? HEARTS.regenHours * restored : 0) * 3_600_000);
  return { ...state, hearts: { count, updatedAt: nextUpdate.toISOString() } };
}

function touchDay(state: ProgressState, today: string): ProgressState {
  if (state.days[today]) {
    // Streak bookkeeping still needs to run on the very first event of the day.
    if (state.streak.lastActive === today) return state;
  }
  let streak = state.streak;
  if (streak.lastActive !== today) {
    if (streak.lastActive === null) {
      streak = { ...streak, current: 1, longest: Math.max(1, streak.longest), lastActive: today };
    } else {
      const gap = daysBetween(streak.lastActive, today);
      if (gap === 1) {
        const current = streak.current + 1;
        streak = { current, longest: Math.max(current, streak.longest), lastActive: today };
      } else if (gap > 1) {
        streak = { current: 1, longest: Math.max(1, streak.longest), lastActive: today };
      } else {
        streak = { ...streak, lastActive: today };
      }
    }
  }
  return { ...state, streak, days: { ...state.days, [today]: todayLog(state, today) } };
}

function addXp(state: ProgressState, amount: number, today: string): ProgressState {
  if (amount <= 0) return state;
  const log = todayLog(state, today);
  const days = { ...state.days, [today]: { ...log, xp: log.xp + amount } };
  let next: ProgressState = { ...state, xp: state.xp + amount, days };

  // Daily goal bonus (once per day)
  if (
    next.dailyGoal > 0 &&
    next.bonusClaimed.dailyGoal !== today &&
    days[today].xp >= next.dailyGoal
  ) {
    const goalLog = days[today];
    next = {
      ...next,
      xp: next.xp + xpTable.dailyGoalBonus,
      bonusClaimed: { ...next.bonusClaimed, dailyGoal: today },
      days: { ...days, [today]: { ...goalLog, xp: goalLog.xp + xpTable.dailyGoalBonus } },
    };
  }
  return next;
}

function bumpPhrase(
  state: ProgressState,
  id: string,
  lesson: number,
  correct: boolean,
  today: string,
): ProgressState {
  const existing = state.phrases[id] ?? { ...emptySrs(), lesson, learned: false };
  const srs = advance(existing, correct, today);
  const phrases = {
    ...state.phrases,
    [id]: { ...srs, lesson, learned: existing.learned || correct },
  };
  return { ...state, phrases };
}

function completeLessonRecord(
  state: ProgressState,
  lesson: number,
  correct: number,
  total: number,
  today: string,
): ProgressState {
  const key = String(lesson);
  const prev = state.lessons[key] ?? {
    completed: false,
    completedAt: null,
    attempts: 0,
    bestScore: 0,
    bestTotal: 0,
    perfect: false,
  };
  const perfect = correct === total && total > 0;
  const record = {
    completed: true,
    completedAt: today,
    attempts: prev.attempts + 1,
    bestScore: Math.max(prev.bestScore, correct),
    bestTotal: Math.max(prev.bestTotal, total),
    perfect: prev.perfect || perfect,
  };
  const firstTime = !prev.completed;
  const lessons = { ...state.lessons, [key]: record };
  const log = todayLog(state, today);
  const totals = {
    ...state.totals,
    perfectLessons: state.totals.perfectLessons + (perfect && !prev.perfect ? 1 : 0),
  };
  let next: ProgressState = { ...state, lessons, totals };
  if (firstTime) {
    next = { ...next, days: { ...next.days, [today]: { ...log, lessons: log.lessons + 1 } } };
  }
  next = addXp(next, xpTable.lessonCompleted, today);
  if (perfect && !prev.perfect) next = addXp(next, xpTable.perfectLesson, today);
  return next;
}

export function reduce(
  state: ProgressState,
  event: ProgressEvent,
  metas: LessonMeta[],
): ProgressState {
  const today = dateKey();
  let next = regenHearts(state);

  switch (event.type) {
    case "answer": {
      next = touchDay(next, today);
      const id = phraseId(event.lesson, event.phraseIndex);
      next = bumpPhrase(next, id, event.lesson, event.correct, today);
      const combo = event.correct ? next.combo + 1 : 0;
      const log = todayLog(next, today);
      next = {
        ...next,
        combo,
        bestCombo: Math.max(next.bestCombo, combo),
        totals: {
          ...next.totals,
          correct: next.totals.correct + (event.correct ? 1 : 0),
          wrong: next.totals.wrong + (event.correct ? 0 : 1),
        },
        days: {
          ...next.days,
          [today]: {
            ...log,
            correct: log.correct + (event.correct ? 1 : 0),
            wrong: log.wrong + (event.correct ? 0 : 1),
          },
        },
      };
      if (event.correct) {
        const bonus = 1 + comboBonus(next.combo) / 100;
        next = addXp(next, Math.round(xpTable.correctAnswer * bonus), today);
      }
      if (!event.correct && next.settings.hearts) {
        next = {
          ...next,
          hearts: { count: Math.max(0, next.hearts.count - 1), updatedAt: new Date().toISOString() },
        };
      }
      break;
    }
    case "flashcard": {
      next = touchDay(next, today);
      next = {
        ...next,
        totals: { ...next.totals, flashcards: next.totals.flashcards + 1 },
      };
      next = addXp(next, event.reverse ? xpTable.reverseFlashcard : xpTable.flashcard, today);
      break;
    }
    case "lessonComplete": {
      next = touchDay(next, today);
      next = completeLessonRecord(next, event.lesson, event.correct, event.total, today);
      break;
    }
    case "examComplete": {
      next = touchDay(next, today);
      const key = String(event.block);
      const prev = next.exams[key];
      const record = {
        score: Math.max(prev?.score ?? 0, event.correct),
        total: event.total,
        completedAt: today,
      };
      next = {
        ...next,
        exams: { ...next.exams, [key]: record },
        totals: { ...next.totals, exams: next.totals.exams + 1 },
      };
      next = addXp(next, xpTable.examCompleted, today);
      break;
    }
    case "reviewComplete": {
      next = touchDay(next, today);
      const log = todayLog(next, today);
      next = {
        ...next,
        totals: { ...next.totals, reviews: next.totals.reviews + 1 },
        days: { ...next.days, [today]: { ...log, reviews: log.reviews + 1 } },
      };
      next = addXp(next, xpTable.reviewCompleted, today);
      break;
    }
    case "setDailyGoal": {
      next = { ...next, dailyGoal: event.value };
      break;
    }
    case "setSettings": {
      const patch = event.patch as Partial<Settings>;
      next = { ...next, settings: { ...next.settings, ...patch } };
      break;
    }
    case "activate": {
      next = { ...next, license: { key: event.key, activatedAt: new Date().toISOString() } };
      break;
    }
    case "deactivate": {
      next = { ...next, license: null };
      break;
    }
    case "reset": {
      const preserved: Settings = { ...next.settings };
      const fresh = defaultState(courseConfig.hearts.enabled, courseConfig.hearts.max);
      next = { ...fresh, settings: { ...fresh.settings, ...preserved, hearts: preserved.hearts } };
      break;
    }
    case "touch": {
      next = touchDay(next, today);
      break;
    }
    default:
      break;
  }

  // Streak bonus for a five-day streak, once per streak milestone day.
  if (
    next.streak.current >= 5 &&
    next.streak.current % 5 === 0 &&
    next.bonusClaimed.streak5 !== today
  ) {
    next = addXp(next, xpTable.streakBonus5, today);
    next = { ...next, bonusClaimed: { ...next.bonusClaimed, streak5: today } };
  }

  return evaluateAchievements(next, metas);
}

function comboBonus(combo: number): number {
  let bonus = 0;
  for (const rule of courseConfig.combo) {
    if (combo >= rule.streak) bonus = rule.bonusPercent;
  }
  return bonus;
}

function milestoneCompleted(state: ProgressState, metas: LessonMeta[], milestoneId: string): boolean {
  const lessons = metas.filter((meta) => meta.milestone === milestoneId);
  if (lessons.length === 0) return false;
  return lessons.every((meta) => state.lessons[String(meta.lesson)]?.completed);
}

export function evaluateAchievements(
  state: ProgressState,
  metas: LessonMeta[],
): ProgressState {
  const today = dateKey();
  const lessonsCompleted = Object.values(state.lessons).filter((lesson) => lesson.completed).length;
  const phrasesLearned = Object.values(state.phrases).filter((phrase) => phrase.learned).length;
  const log = state.days[today];
  const answersToday = log ? log.correct + log.wrong : 0;
  const unlocked: Record<string, string> = { ...state.achievements };

  for (const achievement of courseConfig.achievements) {
    if (unlocked[achievement.id]) continue;
    const { type, value } = achievement.rule;
    let done = false;
    switch (type) {
      case "lessonsCompleted":
        done = lessonsCompleted >= Number(value);
        break;
      case "lessonCompleted":
        done = Boolean(state.lessons[String(value)]?.completed);
        break;
      case "correctAnswers":
        done = state.totals.correct >= Number(value);
        break;
      case "streak":
        done = state.streak.current >= Number(value);
        break;
      case "perfectLessons":
        done = state.totals.perfectLessons >= Number(value);
        break;
      case "phrasesLearned":
        done = phrasesLearned >= Number(value);
        break;
      case "mistakeFreeDay":
        done = answersToday >= Number(value) && (log?.wrong ?? 0) === 0;
        break;
      case "reviewSessions":
        done = state.totals.reviews >= Number(value);
        break;
      case "examsCompleted":
        done = state.totals.exams >= Number(value);
        break;
      case "xp":
        done = state.xp >= Number(value);
        break;
      case "milestoneCompleted":
        done = milestoneCompleted(state, metas, String(value));
        break;
      default:
        done = false;
    }
    if (done) unlocked[achievement.id] = today;
  }

  if (Object.keys(unlocked).length === Object.keys(state.achievements).length) return state;
  return { ...state, achievements: unlocked };
}

/** Milestones with live completion data, used by the adaptation map. */
export function milestoneProgress(state: ProgressState, metas: LessonMeta[]) {
  return milestones.map((milestone) => {
    const lessons = metas.filter((meta) => meta.milestone === milestone.id);
    const completed = lessons.filter((meta) => state.lessons[String(meta.lesson)]?.completed);
    const unlockedIndex = lessons.findIndex((meta) => !state.lessons[String(meta.lesson)]?.completed);
    const unlocked = lessons.length > 0 && completed.length > 0;
    return {
      ...milestone,
      lessons,
      completedCount: completed.length,
      totalCount: lessons.length,
      percent: lessons.length ? Math.round((completed.length / lessons.length) * 100) : 0,
      completed: lessons.length > 0 && completed.length === lessons.length,
      nextLesson: unlockedIndex === -1 ? null : lessons[unlockedIndex].lesson,
      locked: !unlocked,
    };
  });
}

export function nextReviewKey(state: ProgressState): string | null {
  const dates = Object.values(state.phrases)
    .map((phrase) => phrase.due)
    .filter((value): value is string => Boolean(value))
    .sort();
  const today = dateKey();
  const future = dates.find((due) => daysBetween(today, due) > 0);
  return future ?? (dates[0] ? addDays(today, 1) : null);
}
