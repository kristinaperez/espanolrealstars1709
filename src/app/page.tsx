import type { Metadata } from "next";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { DemoLesson } from "@/components/landing/demo";
import { Badge, Card } from "@/components/ui/card";
import { categories, course, courseConfig, milestones, payments, pricing } from "@/lib/content/config";
import { getCourseStats, getDistractorPool, getLesson, getLessonMetas } from "@/lib/content/loader";

export const metadata: Metadata = {
  title: "Español Real — учим живой испанский для жизни в Испании",
  description:
    "Master real-life phrases instead of memorizing grammar. 45 уроков по авторскому учебнику: квартира, банк, врач, документы, работа и друзья в Испании.",
  alternates: { canonical: "/" },
};

const BENEFITS = [
  { emoji: "🗣️", title: "Реальные разговоры", text: "Только фразы, которые слышно на улицах Мадрида и Валенсии." },
  { emoji: "📅", title: "Ежедневные ситуации", text: "Квартира, кофе, рынок, метро, врач, банк, документы, работа." },
  { emoji: "✍️", title: "Авторский метод", text: "Уроки построены на учебнике: фразы, примеры и комментарии автора." },
  { emoji: "🔁", title: "Обучение через повторение", text: "Интервалы 1 → 3 → 7 → 30 → 90 дней: помните надолго." },
  { emoji: "🪶", title: "Легко и быстро", text: "10 минут в день, без установки и без аккаунтов." },
  { emoji: "🧳", title: "Для эмигрантов и путешественников", text: "Язык адаптации, а не академический испанский." },
];

export default function LandingPage() {
  const stats = getCourseStats();
  const lesson = getLesson(1);
  const pool = getDistractorPool(1, 40);

  return (
    <div className="min-h-dvh">
      {/* ---------------- header ---------------- */}
      <header className="sticky top-0 z-40 border-b border-line bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-lg text-primary-contrast shadow-[0_3px_0_0_var(--primary-strong)]">
              🇪🇸
            </span>
            <span className="leading-tight">
              <span className="block text-base font-extrabold tracking-tight">Español Real</span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                живой испанский
              </span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-muted md:flex">
            <a href="#demo" className="hover:text-foreground">Демо</a>
            <a href="#structure" className="hover:text-foreground">Программа</a>
            <a href="#pricing" className="hover:text-foreground">Цена</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </nav>
          <Link
            href="/learn"
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-5 text-[15px] font-semibold text-primary-contrast shadow-[0_4px_0_0_var(--primary-strong)]"
          >
            Start Free
          </Link>
        </div>
      </header>

      {/* ---------------- hero ---------------- */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="grain absolute inset-0 opacity-60" />
        <div
          aria-hidden
          className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div className="flex flex-col items-start gap-6">
            <Badge tone="primary">
              <Sparkles className="h-3.5 w-3.5" /> Курс по авторскому учебнику
            </Badge>
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Learn Real Spanish{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Spoken in Spain
              </span>
            </h1>
            <p className="max-w-xl text-lg text-muted">
              Master real-life phrases instead of memorizing grammar. От «Me cuentas» до собеседования и разговора с
              врачом — только то, что реально нужно в Испании.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/learn"
                className="inline-flex h-14 items-center justify-center rounded-2xl bg-primary px-8 text-base font-semibold text-primary-contrast shadow-[0_5px_0_0_var(--primary-strong)]"
              >
                Начать бесплатно
              </Link>
              <a
                href="#demo"
                className="inline-flex h-14 items-center justify-center rounded-2xl border border-line bg-surface px-8 text-base font-semibold"
              >
                Попробовать демо
              </a>
            </div>
            <p className="text-sm text-muted">
              {course.freeLessonCount} уроков бесплатно · без карты · без регистрации
            </p>
            <dl className="mt-2 grid w-full max-w-lg grid-cols-3 gap-3">
              <HeroStat value={`${stats.lessons}`} label="уроков" />
              <HeroStat value={`${stats.phrases}`} label="живых фраз" />
              <HeroStat value={`${stats.exams}`} label="экзаменов" />
            </dl>
          </div>

          <div className="flex flex-col gap-4">
            <Card className="animate-float border-primary/25">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Пример фразы</p>
              <p className="mt-2 text-3xl font-extrabold tracking-tight">Me pones un café con leche, por favor</p>
              <p className="mt-2 text-sm text-muted">
                Мне кофе с молоком, пожалуйста — так заказывают в Испании, а не «I would like…».
              </p>
            </Card>
            <Card className="border-accent/40 bg-accent/12">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Карта адаптации</p>
              <ul className="mt-3 grid grid-cols-2 gap-2 text-sm font-semibold">
                {milestones.slice(0, 6).map((milestone) => (
                  <li key={milestone.id} className="flex items-center gap-2 rounded-2xl bg-surface/70 px-3 py-2">
                    <span>{milestone.emoji}</span>
                    <span className="truncate">{milestone.title}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* ---------------- benefits ---------------- */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Почему это работает</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <Card key={benefit.title} className="flex flex-col gap-2">
              <span className="text-3xl">{benefit.emoji}</span>
              <h3 className="text-lg font-extrabold tracking-tight">{benefit.title}</h3>
              <p className="text-sm text-muted">{benefit.text}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ---------------- demo ---------------- */}
      <section id="demo" className="border-y border-line bg-background-soft py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Интерактивное демо</h2>
              <p className="mt-2 max-w-2xl text-muted">
                Попробуйте первый урок прямо здесь — без регистрации и установки. Всё работает офлайн.
              </p>
            </div>
            <Link href="/lesson/1" className="text-sm font-bold text-primary underline decoration-primary/40">
              Открыть полный урок →
            </Link>
          </div>
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {lesson ? <DemoLesson lesson={lesson} pool={pool} /> : null}
            <div className="flex flex-col gap-4">
              <Card>
                <p className="text-sm font-bold">7 типов упражнений</p>
                <ul className="mt-3 flex flex-col gap-2 text-sm text-muted">
                  {[
                    "Карточки: Español → Русский",
                    "Обратные карточки: Русский → Español",
                    "Выбор правильного перевода",
                    "Вставка пропущенного слова",
                    "Сборка фразы из слов",
                    "Верно / неверно",
                    "Перевод с клавиатуры",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {item}
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="border-success/40 bg-success/8">
                <p className="text-sm font-bold">Геймификация без детскости</p>
                <p className="mt-2 text-sm text-muted">
                  XP, уровни, серии дней, комбо-бонусы, достижения и календарь занятий. Мотивирует возвращаться каждый
                  день.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- structure ---------------- */}
      <section id="structure" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Структура курса</h2>
        <p className="mt-2 max-w-2xl text-muted">
          {stats.lessons} уроков, {stats.phrases} фраз, {stats.exams} экзаменов. Каждый 5-й урок — проверка блока.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {milestones.map((milestone, index) => {
            const lessons = getMilestoneLessonCount(milestone.id);
            return (
              <Card key={milestone.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{milestone.emoji}</span>
                  <Badge>Этап {index + 1}</Badge>
                </div>
                <h3 className="text-lg font-extrabold tracking-tight">{milestone.title}</h3>
                <p className="text-sm text-muted">{milestone.description}</p>
                <p className="mt-1 text-xs font-bold text-muted">{lessons} уроков · {milestone.unlockHint}</p>
              </Card>
            );
          })}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {categories.map((category) => (
            <Badge key={category.id}>
              {category.emoji} {category.labelRu}
            </Badge>
          ))}
        </div>
      </section>

      {/* ---------------- testimonials ---------------- */}
      <section className="border-y border-line bg-background-soft py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Отзывы учеников</h2>
          <p className="mt-2 text-sm text-muted">
            Отзывы-заглушки: скоро здесь будут реальные скриншоты и истории учеников автора.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courseConfig.testimonials.map((item) => (
              <Card key={item.name} className="flex flex-col gap-3">
                <p className="text-[15px] leading-relaxed">«{item.quote}»</p>
                <div className="mt-auto flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/12 text-lg">🙂</span>
                  <span>
                    <span className="block text-sm font-bold">{item.name}</span>
                    <span className="block text-xs text-muted">{item.role}</span>
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- pricing ---------------- */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Стоимость</h2>
        <p className="mt-2 text-muted">
          Никаких подписок. Premium — разовая покупка за {payments.starsPrice} ⭐ в Telegram.
        </p>
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <Card className="flex flex-col gap-4">
            <div>
              <h3 className="text-xl font-extrabold tracking-tight">{pricing.free.title}</h3>
              <p className="text-sm text-muted">{pricing.free.period}</p>
              <p className="mt-3 text-4xl font-extrabold">{pricing.free.price}</p>
            </div>
            <ul className="flex flex-col gap-2 text-sm">
              {pricing.free.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {feature}
                </li>
              ))}
            </ul>
            <Link
              href="/learn"
              className="mt-auto inline-flex h-14 items-center justify-center rounded-2xl border-2 border-primary px-6 text-base font-semibold text-primary"
            >
              {pricing.free.cta}
            </Link>
          </Card>
          <Card className="relative flex flex-col gap-4 border-2 border-primary/40 shadow-[0_16px_44px_rgba(255,90,60,0.16)]">
            <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-contrast">
              Рекомендуем
            </span>
            <div>
              <h3 className="text-xl font-extrabold tracking-tight">{pricing.premium.title}</h3>
              <p className="text-sm text-muted">{pricing.premium.period}</p>
              <p className="mt-3 flex flex-wrap items-baseline gap-2">
                <span className="text-4xl font-extrabold">{payments.starsPrice} ⭐</span>
                <span className="text-base font-semibold text-muted">единоразово</span>
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {payments.methods.map((method) => (
                  <li
                    key={method.id}
                    className="rounded-full border border-line bg-background-soft px-3 py-1 text-xs font-bold"
                  >
                    {method.id === "telegram_stars" ? "⭐ " : "🔑 "}
                    {method.label}
                  </li>
                ))}
              </ul>
            </div>
            <ul className="flex flex-col gap-2 text-sm">
              {pricing.premium.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {feature}
                </li>
              ))}
            </ul>
            <Link
              href="/learn/settings#premium"
              className="mt-auto inline-flex h-14 items-center justify-center rounded-2xl bg-primary px-6 text-base font-semibold text-primary-contrast shadow-[0_4px_0_0_var(--primary-strong)]"
            >
              {pricing.premium.cta}
            </Link>
            <p className="text-xs text-muted">{pricing.premium.note}</p>
          </Card>
        </div>
      </section>

      {/* ---------------- faq ---------------- */}
      <section id="faq" className="border-t border-line bg-background-soft py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Частые вопросы</h2>
          <div className="mt-8 flex flex-col gap-3">
            {courseConfig.faq.map((item) => (
              <details key={item.q} className="group rounded-3xl border border-line bg-surface p-5">
                <summary className="cursor-pointer list-none text-base font-bold tracking-tight">
                  <span className="mr-2 text-primary group-open:hidden">+</span>
                  <span className="mr-2 hidden text-primary group-open:inline">−</span>
                  {item.q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- final cta + footer ---------------- */}
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-col items-center gap-5 rounded-3xl border border-primary/25 bg-primary/8 p-8 text-center">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Говорите по-испански с первого дня в Испании
            </h2>
            <p className="max-w-xl text-muted">
              Начните бесплатно: {course.freeLessonCount} уроков, все типы упражнений и карта адаптации. Прогресс
              сохранится на вашем устройстве.
            </p>
            <Link
              href="/learn"
              className="inline-flex h-14 items-center justify-center rounded-2xl bg-primary px-8 text-base font-semibold text-primary-contrast shadow-[0_5px_0_0_var(--primary-strong)]"
            >
              Начать бесплатно
            </Link>
          </div>

          <div className="mt-10 grid gap-8 text-sm sm:grid-cols-3">
            <div>
              <p className="text-base font-extrabold tracking-tight">Español Real</p>
              <p className="mt-2 text-muted">{course.subtitle}</p>
            </div>
            <div>
              <p className="font-bold">Разделы</p>
              <ul className="mt-2 flex flex-col gap-1 text-muted">
                <li><Link href="/learn" className="hover:text-foreground">Дашборд</Link></li>
                <li><Link href="/learn/lessons" className="hover:text-foreground">Уроки</Link></li>
                <li><Link href="/learn/map" className="hover:text-foreground">Карта адаптации</Link></li>
                <li><Link href="/learn/about" className="hover:text-foreground">О курсе</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-bold">Продукт</p>
              <ul className="mt-2 flex flex-col gap-1 text-muted">
                <li><a href="#pricing" className="hover:text-foreground">Цена</a></li>
                <li><a href="#faq" className="hover:text-foreground">FAQ</a></li>
                <li><Link href="/learn/settings#premium" className="hover:text-foreground">Активация ключа</Link></li>
              </ul>
            </div>
          </div>

          <p className="mt-10 border-t border-line pt-6 text-xs text-muted">
            © {new Date().getFullYear()} Español Real. Учебные материалы принадлежат автору и защищены авторским
            правом. Приложение работает офлайн, прогресс хранится локально.
          </p>
        </div>
      </footer>
    </div>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-3xl border border-line bg-surface p-4 text-center">
      <dt className="text-2xl font-extrabold">{value}</dt>
      <dd className="text-xs font-semibold text-muted">{label}</dd>
    </div>
  );
}

/** Lesson counts per milestone are derived from the JSON files — never hardcoded. */
const MILESTONE_COUNTS = getLessonMetas().reduce<Record<string, number>>((acc, meta) => {
  acc[meta.milestone] = (acc[meta.milestone] ?? 0) + 1;
  return acc;
}, {});

function getMilestoneLessonCount(id: string) {
  return MILESTONE_COUNTS[id] ?? 0;
}
