import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { categories, course, milestones } from "@/lib/content/config";
import { getCourseStats } from "@/lib/content/loader";

export const metadata: Metadata = {
  title: "О курсе",
  description:
    "Авторский метод Español Real: только живые фразы, которые слышно в Испании. 45 уроков, 9 экзаменов, карта адаптации.",
  alternates: { canonical: "/learn/about" },
};

export default function AboutPage() {
  const stats = getCourseStats();

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">О курсе</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Метод Español Real</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">{course.author.method}</p>
      </header>

      <Card>
        <h2 className="text-lg font-extrabold tracking-tight">Почему не грамматика</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Грамматика нужна, но она не помогает в первый день в Испании. Помогают готовые фразы: «Me pones un café con
          leche», «¿Me puede repetir, por favor?», «Quiero pedir cita». Их можно применить сразу — и именно так
          появляется уверенность.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Каждый урок — это набор фраз из реальных ситуаций: квартира, рынок, метро, врач, банк, миграционная служба,
          собеседование, друзья. Фразы, примеры и комментарии автора взяты из учебника и не заменяются выдуманными
          упражнениями.
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat value={`${stats.lessons}`} label="уроков" />
        <Stat value={`${stats.phrases}`} label="живых фраз" />
        <Stat value={`${stats.exams}`} label="экзаменов" />
        <Stat value={`${stats.tags}`} label="тегов для поиска" />
      </div>

      <Card>
        <h2 className="text-lg font-extrabold tracking-tight">Как построено обучение</h2>
        <ol className="mt-3 flex flex-col gap-3 text-[15px] text-muted">
          <li>
            <strong className="text-foreground">1. Карточки.</strong> Сначала испанский → русский, затем наоборот.
          </li>
          <li>
            <strong className="text-foreground">2. Практика.</strong> Выбор перевода, вставка пропущенного слова,
            сборка фразы, «верно/неверно» и ввод перевода с клавиатуры.
          </li>
          <li>
            <strong className="text-foreground">3. Мини-тест.</strong> 10–20 вопросов в конце урока с оценкой.
          </li>
          <li>
            <strong className="text-foreground">4. Экзамен.</strong> Каждые 5 уроков — большой экзамен по блоку.
          </li>
          <li>
            <strong className="text-foreground">5. Повторение.</strong> Ошибки возвращаются через 1, 3, 7, 30 и 90
            дней.
          </li>
        </ol>
      </Card>

      <Card>
        <h2 className="text-lg font-extrabold tracking-tight">Карта адаптации</h2>
        <p className="mt-2 text-sm text-muted">
          Главной метрикой мы сделали не «уровень языка», а реальные шаги жизни в Испании:
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {milestones.map((milestone) => (
            <li key={milestone.id} className="flex items-center gap-3 rounded-2xl bg-background-soft p-3">
              <span className="text-xl">{milestone.emoji}</span>
              <span className="text-sm font-semibold">{milestone.title}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="text-lg font-extrabold tracking-tight">Темы курса</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {categories.map((category) => (
            <li
              key={category.id}
              className="rounded-2xl border border-line bg-background-soft px-3 py-2 text-sm font-semibold"
            >
              {category.emoji} {category.labelRu}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="text-lg font-extrabold tracking-tight">Приватность и офлайн</h2>
        <p className="mt-2 text-sm text-muted">
          Версия 1.0 полностью статична: нет сервера, нет базы данных, нет аккаунтов. Прогресс хранится в localStorage
          вашего браузера, приложение работает офлайн и устанавливается как PWA. Материалы курса защищены авторским
          правом и используются только в рамках этого приложения.
        </p>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/lesson/1"
          className="inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-6 text-[15px] font-semibold text-primary-contrast shadow-[0_4px_0_0_var(--primary-strong)]"
        >
          Начать с урока 1
        </Link>
        <Link
          href="/learn/map"
          className="inline-flex h-12 items-center justify-center rounded-2xl border border-line bg-surface px-6 text-[15px] font-semibold"
        >
          Посмотреть карту адаптации
        </Link>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-3xl border border-line bg-surface p-4 text-center">
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="mt-1 text-xs font-semibold text-muted">{label}</p>
    </div>
  );
}
