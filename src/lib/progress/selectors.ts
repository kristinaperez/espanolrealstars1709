import { FREE_LESSON_COUNT, levelFromXp, levelProgress, milestones } from "@/lib/content/config";
import type { LessonMeta } from "@/lib/content/types";
import { dueCount } from "@/lib/srs";
import { dateKey, daysBetween } from "@/lib/utils";
import type { ProgressState } from "./types";
import { nextReviewKey } from "./reducer";

export function isPremium(state: ProgressState): boolean {
  return Boolean(state.license);
}

export function hasAccess(state: ProgressState, lesson: number): boolean {
  return lesson <= FREE_LESSON_COUNT || isPremium(state);
}

export function lessonsCompleted(state: ProgressState): number {
  return Object.values(state.lessons).filter((lesson) => lesson.completed).length;
}

export function computeStats(state: ProgressState, metas: LessonMeta[]) {
  const totalLessons = metas.length;
  const completed = lessonsCompleted(state);
  const phrasesTotal = metas.reduce((sum, meta) => sum + meta.phraseCount, 0);
  const phrases = Object.values(state.phrases);
  const phrasesLearned = phrases.filter((phrase) => phrase.learned).length;
  const phrasesMastered = phrases.filter((phrase) => phrase.step >= 3).length;
  const answers = state.totals.correct + state.totals.wrong;
  const accuracy = answers === 0 ? 0 : Math.round((state.totals.correct / answers) * 100);
  const level = levelFromXp(state.xp);
  const progress = levelProgress(state.xp);
  const today = dateKey();
  const due = dueCount(state.phrases, today);
  const log = state.days[today];
  const milestonesDone = milestones.filter((milestone) => {
    const lessons = metas.filter((meta) => meta.milestone === milestone.id);
    return lessons.length > 0 && lessons.every((meta) => state.lessons[String(meta.lesson)]?.completed);
  }).length;

  return {
    xp: state.xp,
    level: level.level,
    levelName: level.name,
    xpInLevel: progress.xpInLevel,
    xpForLevel: progress.xpForLevel,
    xpToNext: progress.xpToNext,
    levelPercent: progress.percent,
    lessonsCompleted: completed,
    lessonsTotal: totalLessons,
    coursePercent: totalLessons === 0 ? 0 : Math.round((completed / totalLessons) * 100),
    phrasesLearned,
    phrasesMastered,
    phrasesTotal,
    correct: state.totals.correct,
    wrong: state.totals.wrong,
    answers,
    accuracy,
    streak: state.streak.current,
    longestStreak: state.streak.longest,
    mistakesWaiting: due,
    reviewTotal: phrases.length,
    examsPassed: state.totals.exams,
    achievementsUnlocked: Object.keys(state.achievements).length,
    achievementsTotal: milestones.length,
    milestonesCompleted: milestonesDone,
    milestonesTotal: milestones.length,
    todayXp: log?.xp ?? 0,
    todayGoal: state.dailyGoal,
    nextReview: nextReviewKey(state),
    bestCombo: state.bestCombo,
    studiedDays: Object.keys(state.days).length,
  };
}

/** Days for the study calendar around a given month. */
export function calendarDays(state: ProgressState, year: number, month: number) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // Monday-first grid
  const cells: ({ key: string; day: number; xp: number; studied: boolean; isToday: boolean } | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  const today = dateKey();
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const log = state.days[key];
    cells.push({
      key,
      day,
      xp: log?.xp ?? 0,
      studied: Boolean(log && log.xp > 0),
      isToday: key === today,
    });
  }
  return cells;
}

export function streakStatus(state: ProgressState) {
  const today = dateKey();
  const last = state.streak.lastActive;
  if (!last) return { active: false, daysSince: null as number | null };
  return { active: daysBetween(last, today) === 0, daysSince: daysBetween(last, today) };
}

export function motivationMessage(percent: number, correct: boolean): string {
  if (percent >= 100) return "Цель дня выполнена! 🎉";
  if (!correct) return "Ничего страшного, ошибка — часть обучения.";
  if (percent >= 80) return "Почти всё!";
  if (percent >= 50) return "Отличный темп!";
  return "Keep going!";
}
