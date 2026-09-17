import type { Distractor, Lesson, LessonPhrase } from "@/lib/content/types";
import {
  hashString,
  mulberry32,
  pickBlankToken,
  sampleN,
  shuffle,
  tokenize,
  type Rng,
} from "@/lib/text";

export type ExerciseKind =
  | "flashcard"
  | "reverse-flashcard"
  | "choice"
  | "fill"
  | "build"
  | "truefalse"
  | "translate";

export interface ExerciseBase {
  id: string;
  kind: ExerciseKind;
  lesson: number;
  phraseIndex: number;
  phrase: LessonPhrase;
  /** ungraded items only award XP */
  gradable: boolean;
}

export interface FlashcardExercise extends ExerciseBase {
  kind: "flashcard";
  reverse: false;
}
export interface ReverseFlashcardExercise extends ExerciseBase {
  kind: "reverse-flashcard";
  reverse: true;
}
export interface ChoiceExercise extends ExerciseBase {
  kind: "choice";
  direction: "es-ru" | "ru-es";
  options: string[];
  answerIndex: number;
}
export interface FillExercise extends ExerciseBase {
  kind: "fill";
  sentence: string;
  answer: string;
  options: string[];
}
export interface BuildExercise extends ExerciseBase {
  kind: "build";
  tokens: string[];
  answer: string;
}
export interface TrueFalseExercise extends ExerciseBase {
  kind: "truefalse";
  shown: string;
  shownTranslation: string;
  isTrue: boolean;
}
export interface TranslateExercise extends ExerciseBase {
  kind: "translate";
  answer: string;
  hint: string;
}

export type Exercise =
  | FlashcardExercise
  | ReverseFlashcardExercise
  | ChoiceExercise
  | FillExercise
  | BuildExercise
  | TrueFalseExercise
  | TranslateExercise;

export interface StudySession {
  exercises: Exercise[];
  gradableCount: number;
}

const CHOICE_OPTIONS = 4;

function otherTranslations(pool: Distractor[], avoid: string, count: number, rng: Rng): string[] {
  const unique: string[] = [];
  for (const item of shuffle(pool, rng)) {
    if (item.translation === avoid) continue;
    if (unique.includes(item.translation)) continue;
    unique.push(item.translation);
    if (unique.length >= count) break;
  }
  return unique;
}

function otherSpanish(pool: Distractor[], avoid: string, count: number, rng: Rng): string[] {
  const unique: string[] = [];
  for (const item of shuffle(pool, rng)) {
    if (item.spanish === avoid) continue;
    if (unique.includes(item.spanish)) continue;
    unique.push(item.spanish);
    if (unique.length >= count) break;
  }
  return unique;
}

function makeChoice(
  phrase: LessonPhrase,
  lesson: number,
  phraseIndex: number,
  pool: Distractor[],
  rng: Rng,
): ChoiceExercise {
  const direction: "es-ru" | "ru-es" = rng() > 0.5 ? "es-ru" : "ru-es";
  const correct = direction === "es-ru" ? phrase.translation : phrase.spanish;
  const distractors =
    direction === "es-ru"
      ? otherTranslations(pool, correct, CHOICE_OPTIONS - 1, rng)
      : otherSpanish(pool, correct, CHOICE_OPTIONS - 1, rng);
  const options = shuffle([correct, ...distractors], rng);
  return {
    id: `choice-${lesson}-${phraseIndex}-${direction}`,
    kind: "choice",
    lesson,
    phraseIndex,
    phrase,
    gradable: true,
    direction,
    options,
    answerIndex: options.indexOf(correct),
  };
}

function makeFill(
  phrase: LessonPhrase,
  lesson: number,
  phraseIndex: number,
  pool: Distractor[],
  rng: Rng,
): FillExercise | null {
  const source = phrase.example && phrase.example.includes(" ") ? phrase.example : phrase.spanish;
  const blank = pickBlankToken(source, rng);
  if (!blank) return null;
  const distractWords = shuffle(
    pool
      .flatMap((item) => tokenize(item.spanish))
      .filter((token) => token.toLowerCase() !== blank.answer.toLowerCase() && token.length > 2),
    rng,
  ).slice(0, CHOICE_OPTIONS - 1);
  const options = shuffle([blank.answer, ...distractWords], rng);
  return {
    id: `fill-${lesson}-${phraseIndex}`,
    kind: "fill",
    lesson,
    phraseIndex,
    phrase,
    gradable: true,
    sentence: blank.blanked,
    answer: blank.answer,
    options,
  };
}

function makeBuild(phrase: LessonPhrase, lesson: number, phraseIndex: number): BuildExercise | null {
  const tokens = tokenize(phrase.spanish);
  if (tokens.length < 2 || tokens.length > 7) return null;
  return {
    id: `build-${lesson}-${phraseIndex}`,
    kind: "build",
    lesson,
    phraseIndex,
    phrase,
    gradable: true,
    tokens: shuffle(tokens, mulberry32(hashString(phrase.spanish))),
    answer: tokens.join(" "),
  };
}

function makeTrueFalse(
  phrase: LessonPhrase,
  lesson: number,
  phraseIndex: number,
  pool: Distractor[],
  rng: Rng,
): TrueFalseExercise {
  const isTrue = rng() > 0.4;
  const wrong = otherTranslations(pool, phrase.translation, 1, rng)[0] ?? phrase.translation;
  const shownTranslation = isTrue ? phrase.translation : wrong;
  return {
    id: `tf-${lesson}-${phraseIndex}-${isTrue}`,
    kind: "truefalse",
    lesson,
    phraseIndex,
    phrase,
    gradable: true,
    shown: phrase.spanish,
    shownTranslation,
    isTrue,
  };
}

function makeTranslate(
  phrase: LessonPhrase,
  lesson: number,
  phraseIndex: number,
): TranslateExercise {
  const words = tokenize(phrase.spanish);
  const hint = words
    .map((word) => (word.length <= 2 ? word : `${word.slice(0, 1)}${"·".repeat(Math.max(1, word.length - 1))}`))
    .join(" ");
  return {
    id: `translate-${lesson}-${phraseIndex}`,
    kind: "translate",
    lesson,
    phraseIndex,
    phrase,
    gradable: true,
    answer: phrase.spanish,
    hint,
  };
}

/** One graded exercise per phrase, mixed kinds, deterministic per seed. */
export function generatePractice(
  phrases: { phrase: LessonPhrase; index: number; lesson: number }[],
  pool: Distractor[],
  seed: string,
  kinds: ExerciseKind[] = ["choice", "fill", "build", "truefalse", "translate"],
  perPhrase = 1,
): Exercise[] {
  const rng = mulberry32(hashString(seed));
  const out: Exercise[] = [];
  for (const item of phrases) {
    for (let i = 0; i < perPhrase; i++) {
      const candidates = shuffle(kinds, rng);
      let made: Exercise | null = null;
      for (const kind of candidates) {
        if (kind === "choice") made = makeChoice(item.phrase, item.lesson, item.index, pool, rng);
        else if (kind === "fill") made = makeFill(item.phrase, item.lesson, item.index, pool, rng);
        else if (kind === "build") made = makeBuild(item.phrase, item.lesson, item.index);
        else if (kind === "truefalse") made = makeTrueFalse(item.phrase, item.lesson, item.index, pool, rng);
        else if (kind === "translate") made = makeTranslate(item.phrase, item.lesson, item.index);
        if (made) break;
      }
      if (made) out.push(made);
    }
  }
  return out;
}

export function flashcardsFor(
  lesson: Lesson,
  reverse = false,
): Exercise[] {
  if (reverse) {
    return lesson.phrases.map<Exercise>((phrase, index) => ({
      id: `rev-${lesson.lesson}-${index}`,
      kind: "reverse-flashcard",
      lesson: lesson.lesson,
      phraseIndex: index,
      phrase,
      gradable: false,
      reverse: true,
    }));
  }
  return lesson.phrases.map<Exercise>((phrase, index) => ({
    id: `fc-${lesson.lesson}-${index}`,
    kind: "flashcard",
    lesson: lesson.lesson,
    phraseIndex: index,
    phrase,
    gradable: false,
    reverse: false,
  }));
}

export function buildLessonSession(
  lesson: Lesson,
  pool: Distractor[],
  seedSuffix = "",
): StudySession {
  const phrases = lesson.phrases.map((phrase, index) => ({ phrase, index, lesson: lesson.lesson }));
  const cards = [...flashcardsFor(lesson, false), ...flashcardsFor(lesson, true)];
  const practice = generatePractice(phrases, pool, `${lesson.lesson}-${lesson.slug}-${seedSuffix}`);
  const quiz = generatePractice(
    phrases,
    pool,
    `${lesson.lesson}-quiz-${seedSuffix}`,
    ["choice", "fill", "build", "truefalse"],
    1,
  );
  const exercises = [...cards, ...practice, ...quiz];
  return {
    exercises,
    gradableCount: exercises.filter((exercise) => exercise.gradable).length,
  };
}

export function buildExamSession(
  lessons: Lesson[],
  pool: Distractor[],
  seed: string,
  count: number,
): StudySession {
  const phrases = lessons.flatMap((lesson) =>
    lesson.phrases.map((phrase, index) => ({ phrase, index, lesson: lesson.lesson })),
  );
  const rng = mulberry32(hashString(seed));
  const picked = sampleN(phrases, Math.min(count, phrases.length), rng);
  const exercises = generatePractice(picked, pool, seed, [
    "choice",
    "fill",
    "build",
    "truefalse",
    "translate",
  ]);
  return { exercises, gradableCount: exercises.length };
}
