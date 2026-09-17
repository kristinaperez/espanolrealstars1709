import rawConfig from "../../../data/course.config.json";

export interface CategoryConfig {
  id: string;
  label: string;
  labelRu: string;
  emoji: string;
  color: string;
}

export interface MilestoneConfig {
  id: string;
  emoji: string;
  title: string;
  titleEn: string;
  description: string;
  unlockHint: string;
}

export interface LevelConfig {
  level: number;
  name: string;
  nameEs: string;
  minXp: number;
}

export interface AchievementRule {
  type:
    | "lessonsCompleted"
    | "lessonCompleted"
    | "correctAnswers"
    | "streak"
    | "perfectLessons"
    | "phrasesLearned"
    | "mistakeFreeDay"
    | "reviewSessions"
    | "examsCompleted"
    | "milestoneCompleted"
    | "xp";
  value: number | string;
}

export interface AchievementConfig {
  id: string;
  emoji: string;
  title: string;
  description: string;
  rule: AchievementRule;
}

export interface XpConfig {
  flashcard: number;
  reverseFlashcard: number;
  correctAnswer: number;
  perfectLesson: number;
  lessonCompleted: number;
  reviewCompleted: number;
  examCompleted: number;
  streakBonus5: number;
  dailyGoalBonus: number;
}

export interface PaymentMethodConfig {
  id: "telegram_stars" | "license_key" | string;
  label: string;
  note: string;
  enabled: boolean;
}

export interface PaymentsConfig {
  premiumProductId: string;
  starsPrice: number;
  currency: string;
  methods: PaymentMethodConfig[];
}

export interface CourseConfig {
  payments: PaymentsConfig;
  course: {
    id: string;
    title: string;
    tagline: string;
    subtitle: string;
    language: string;
    sourceLanguage: string;
    freeLessonCount: number;
    examEvery: number;
    quizQuestionCount: number;
    examQuestionCount: number;
    author: { name: string; method: string };
  };
  categories: CategoryConfig[];
  milestones: MilestoneConfig[];
  levels: LevelConfig[];
  xpPerLevel: number;
  xp: XpConfig;
  combo: { streak: number; bonusPercent: number }[];
  hearts: { enabled: boolean; max: number; regenHours: number };
  dailyGoals: number[];
  srs: { intervalsDays: number[]; maxIntervalDays: number };
  achievements: AchievementConfig[];
  pricing: {
    free: { id: string; title: string; price: string; period: string; features: string[]; cta: string };
    premium: { id: string; title: string; price: string; period: string; features: string[]; cta: string; note: string };
  };
  testimonials: { name: string; role: string; quote: string; placeholder: boolean }[];
  faq: { q: string; a: string }[];
  navigation: { href: string; label: string; icon: string }[];
}

export const courseConfig = rawConfig as unknown as CourseConfig;

export const course = courseConfig.course;

export const categories = courseConfig.categories;
export const milestones = courseConfig.milestones;
export const levelTable = courseConfig.levels;
export const achievementsConfig = courseConfig.achievements;
export const xpTable = courseConfig.xp;
export const pricing = courseConfig.pricing;

export const XP_PER_LEVEL = courseConfig.xpPerLevel;

export const categoryById = new Map(categories.map((c) => [c.id, c]));
export const milestoneById = new Map(milestones.map((m) => [m.id, m]));

export const payments = courseConfig.payments;
export const STARS_PRICE = payments.starsPrice;
export const PREMIUM_PRODUCT_ID = payments.premiumProductId;

export const FREE_LESSON_COUNT = course.freeLessonCount;
export const EXAM_EVERY = course.examEvery;

export function levelFromXp(xp: number): { level: number; name: string; nameEs: string } {
  const level = Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
  let current = levelTable[0];
  for (const entry of levelTable) {
    if (xp >= entry.minXp && entry.level <= level) current = entry;
  }
  const highest = levelTable[levelTable.length - 1];
  if (level > highest.level) {
    return { level, name: highest.name, nameEs: highest.nameEs };
  }
  return { level, name: current.name, nameEs: current.nameEs };
}

export function levelProgress(xp: number) {
  const { level } = levelFromXp(xp);
  const currentLevelXp = (level - 1) * XP_PER_LEVEL;
  const nextLevelXp = level * XP_PER_LEVEL;
  const inLevel = xp - currentLevelXp;
  const needed = nextLevelXp - xp;
  return {
    level,
    xpInLevel: inLevel,
    xpForLevel: XP_PER_LEVEL,
    xpToNext: Math.max(0, needed),
    percent: Math.round((inLevel / XP_PER_LEVEL) * 100),
  };
}

export function comboBonusPercent(combo: number): number {
  let bonus = 0;
  for (const rule of courseConfig.combo) {
    if (combo >= rule.streak) bonus = rule.bonusPercent;
  }
  return bonus;
}
