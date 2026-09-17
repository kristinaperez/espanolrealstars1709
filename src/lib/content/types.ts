export interface LessonPhrase {
  spanish: string;
  translation: string;
  example?: string;
  exampleTranslation?: string;
  notes?: string;
  difficulty?: string;
  tags?: string[];
}

export interface Lesson {
  lesson: number;
  slug: string;
  title: string;
  subtitle?: string;
  category: string;
  milestone: string;
  difficulty: string;
  tags: string[];
  summary?: string;
  situation?: string;
  authorComment?: string;
  phrases: LessonPhrase[];
}

/** Lightweight lesson descriptor used by lists, maps and sitemaps. */
export interface LessonMeta {
  lesson: number;
  slug: string;
  title: string;
  subtitle?: string;
  category: string;
  milestone: string;
  difficulty: string;
  tags: string[];
  summary?: string;
  situation?: string;
  phraseCount: number;
}

export interface SearchEntry {
  lesson: number;
  title: string;
  spanish: string;
  translation: string;
  tags: string[];
  category: string;
  milestone: string;
}

export interface Distractor {
  spanish: string;
  translation: string;
}

export interface ExamBlock {
  block: number;
  fromLesson: number;
  toLesson: number;
  title: string;
  lessons: number[];
  phraseCount: number;
}

/** Compact phrase record used by review, mistakes and search screens. */
export interface IndexedPhrase {
  lesson: number;
  index: number;
  spanish: string;
  translation: string;
  example?: string;
  exampleTranslation?: string;
  difficulty?: string;
  tags?: string[];
}
