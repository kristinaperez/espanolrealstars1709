import { FREE_LESSON_COUNT } from "@/lib/content/config";
import { getDistractorPool } from "@/lib/content/loader";
import type { Distractor, Lesson } from "@/lib/content/types";

/**
 * Premium content protection.
 *
 * Free lessons ship inside the static HTML. Premium lesson phrases are only
 * delivered through `/api/lessons/[n]` after the server confirms an
 * entitlement (a paid license bound to the Telegram account, or a license key).
 *
 * `STATIC_EXPORT=true` builds the offline distribution, where every lesson is
 * bundled on purpose — flip `PROTECT_PREMIUM_CONTENT=false` to do the same in
 * server mode.
 */
export function premiumContentProtectionEnabled(): boolean {
  if (process.env.STATIC_EXPORT === "true") return false;
  const raw = process.env.PROTECT_PREMIUM_CONTENT;
  if (raw === undefined) return true;
  return !(raw === "false" || raw === "0" || raw === "off");
}

export function isFreeLesson(lessonNumber: number): boolean {
  return lessonNumber <= FREE_LESSON_COUNT;
}

/** Number of phrases kept as a public teaser for locked lessons. */
const PREVIEW_PHRASES = 2;

export function trimLesson(lesson: Lesson): Lesson {
  return {
    ...lesson,
    phrases: lesson.phrases.slice(0, PREVIEW_PHRASES),
    authorComment: undefined,
    summary: lesson.summary ?? lesson.subtitle,
  };
}

export function protectLesson(lesson: Lesson): { lesson: Lesson; trimmed: boolean } {
  if (!premiumContentProtectionEnabled() || isFreeLesson(lesson.lesson)) {
    return { lesson, trimmed: false };
  }
  return { lesson: trimLesson(lesson), trimmed: true };
}

export function poolForLesson(lesson: Lesson, trimmed: boolean): Distractor[] {
  if (trimmed) return [];
  return getDistractorPool(lesson.lesson, 40);
}
