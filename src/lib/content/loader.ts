import fs from "node:fs";
import path from "node:path";
import type { Distractor, ExamBlock, IndexedPhrase, Lesson, LessonMeta, SearchEntry } from "./types";
import { EXAM_EVERY } from "./config";

/**
 * Content loader.
 *
 * Everything is read from JSON files inside `/data` at build time, so the whole
 * app can be exported as static HTML. Adding a lesson is a matter of dropping a
 * new `lesson###.json` file into `data/lessons` — no code change required.
 */

const LESSONS_DIR = path.join(process.cwd(), "data", "lessons");

const LESSON_FILE_RE = /lesson[-_ ]?(\d+)\.json$/i;

let cache: Lesson[] | null = null;

function isValidLesson(value: unknown): value is Lesson {
  if (!value || typeof value !== "object") return false;
  const lesson = value as Partial<Lesson>;
  return typeof lesson.lesson === "number" && Array.isArray(lesson.phrases) && lesson.phrases.length > 0;
}

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectFiles(full));
    } else if (entry.isFile() && LESSON_FILE_RE.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** All lessons, sorted by lesson number. Cached for the lifetime of the build. */
export function getAllLessons(): Lesson[] {
  if (cache) return cache;
  const lessons: Lesson[] = [];
  for (const file of collectFiles(LESSONS_DIR)) {
    const match = file.match(LESSON_FILE_RE);
    if (!match) continue;
    const numberFromFile = Number(match[1]);
    try {
      const raw = JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
      if (!isValidLesson(raw)) continue;
      const lesson: Lesson = {
        ...raw,
        slug: raw.slug || `leccion-${numberFromFile}`,
        title: raw.title || `Lección ${numberFromFile}`,
        category: raw.category || "daily-life",
        milestone: raw.milestone || "first-days",
        difficulty: raw.difficulty || "A1",
        tags: raw.tags || [],
      };
      // The file name is the source of truth for the static URL /lesson/N
      lesson.lesson = numberFromFile;
      lessons.push(lesson);
    } catch {
      // A broken file must never break the build of the other 499 lessons.
      console.warn(`[content] skipping unreadable lesson file: ${file}`);
    }
  }
  lessons.sort((a, b) => a.lesson - b.lesson);
  cache = lessons;
  return lessons;
}

export function toMeta(lesson: Lesson): LessonMeta {
  return {
    lesson: lesson.lesson,
    slug: lesson.slug,
    title: lesson.title,
    subtitle: lesson.subtitle,
    category: lesson.category,
    milestone: lesson.milestone,
    difficulty: lesson.difficulty,
    tags: lesson.tags,
    summary: lesson.summary,
    situation: lesson.situation,
    phraseCount: lesson.phrases.length,
  };
}

export function getLessonMetas(): LessonMeta[] {
  return getAllLessons().map(toMeta);
}

export function getLesson(number: number): Lesson | null {
  return getAllLessons().find((lesson) => lesson.lesson === number) ?? null;
}

export function getLessonNumbers(): number[] {
  return getAllLessons().map((lesson) => lesson.lesson);
}

export function getAdjacent(number: number): { prev: LessonMeta | null; next: LessonMeta | null } {
  const metas = getLessonMetas();
  const index = metas.findIndex((meta) => meta.lesson === number);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index > 0 ? metas[index - 1] : null,
    next: index < metas.length - 1 ? metas[index + 1] : null,
  };
}

/** Neutral translations used as multiple-choice distractors. */
export function getDistractorPool(excludeLesson: number, size = 40): Distractor[] {
  const lessons = getAllLessons();
  const pool: Distractor[] = [];
  for (const lesson of lessons) {
    if (lesson.lesson === excludeLesson) continue;
    for (const phrase of lesson.phrases) {
      pool.push({ spanish: phrase.spanish, translation: phrase.translation });
    }
  }
  // Deterministic spread across the whole course, not just the first lessons.
  const step = Math.max(1, Math.floor(pool.length / size));
  const picked: Distractor[] = [];
  for (let i = 0; i < pool.length && picked.length < size; i += step) {
    picked.push(pool[i]);
  }
  return picked;
}

export function getExamBlocks(): ExamBlock[] {
  const lessons = getAllLessons();
  const blocks: ExamBlock[] = [];
  const total = lessons.length;
  for (let start = 1; start <= total; start += EXAM_EVERY) {
    const end = Math.min(start + EXAM_EVERY - 1, total);
    const inBlock = lessons.filter((l) => l.lesson >= start && l.lesson <= end);
    if (inBlock.length === 0) continue;
    blocks.push({
      block: blocks.length + 1,
      fromLesson: start,
      toLesson: end,
      title: `Examen ${blocks.length + 1} · Lecciones ${start}–${end}`,
      lessons: inBlock.map((l) => l.lesson),
      phraseCount: inBlock.reduce((sum, l) => sum + l.phrases.length, 0),
    });
  }
  return blocks;
}

export function getExamBlock(block: number): ExamBlock | null {
  return getExamBlocks().find((item) => item.block === block) ?? null;
}

export function getExamLessons(block: number): Lesson[] {
  const exam = getExamBlock(block);
  if (!exam) return [];
  const set = new Set(exam.lessons);
  return getAllLessons().filter((lesson) => set.has(lesson.lesson));
}

export function getExamBlockForLesson(number: number): ExamBlock | null {
  return getExamBlocks().find((block) => number >= block.fromLesson && number <= block.toLesson) ?? null;
}

export function getSearchIndex(): SearchEntry[] {
  const entries: SearchEntry[] = [];
  for (const lesson of getAllLessons()) {
    for (const phrase of lesson.phrases) {
      entries.push({
        lesson: lesson.lesson,
        title: lesson.title,
        spanish: phrase.spanish,
        translation: phrase.translation,
        tags: [...(phrase.tags ?? []), ...lesson.tags],
        category: lesson.category,
        milestone: lesson.milestone,
      });
    }
  }
  return entries;
}

export function getCourseStats() {
  const lessons = getAllLessons();
  const phrases = lessons.reduce((sum, lesson) => sum + lesson.phrases.length, 0);
  const tags = new Set<string>();
  for (const lesson of lessons) {
    lesson.tags.forEach((tag) => tags.add(tag));
    lesson.phrases.forEach((phrase) => (phrase.tags ?? []).forEach((tag) => tags.add(tag)));
  }
  return { lessons: lessons.length, phrases, tags: tags.size, exams: getExamBlocks().length };
}

export function getTotalPhrases(): number {
  return getAllLessons().reduce((sum, lesson) => sum + lesson.phrases.length, 0);
}

export function getPhraseIndex(): IndexedPhrase[] {
  const out: IndexedPhrase[] = [];
  for (const lesson of getAllLessons()) {
    lesson.phrases.forEach((phrase, index) => {
      out.push({
        lesson: lesson.lesson,
        index,
        spanish: phrase.spanish,
        translation: phrase.translation,
        example: phrase.example,
        exampleTranslation: phrase.exampleTranslation,
        difficulty: phrase.difficulty,
        tags: phrase.tags,
      });
    });
  }
  return out;
}
