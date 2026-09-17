# Español Real

Коммерческий MVP веб-тренажёра разговорного испанского для жизни в Испании.
Контент берётся из авторского учебника; приложение полностью статичное и работает офлайн.

## Что внутри

| Блок | Реализовано |
| --- | --- |
| Контент | 45 уроков (`data/lessons/lesson001…045.json`), 360 фраз, 9 экзаменов |
| Упражнения | Карточки, обратные карточки, выбор перевода, вставка слова, сборка фразы, «верно/неверно», перевод с клавиатуры, мини-тест, экзамен |
| Повторение | Интервалы 1 → 3 → 7 → 30 → 90 дней, очередь ошибок, дневное повторение |
| Геймификация | XP, уровни (Новичок → Native Killer), серия дней, комбо-бонусы, 15 достижений, календарь, цель дня, сердечки (опция, выключены) |
| Карта адаптации | 11 этапов жизни в Испании: от «Первых дней» до «Чувствую себя как дома» |
| Монетизация | 7 бесплатных уроков + Premium **500 ⭐ Telegram Stars** (или лицензионный ключ) |
| Прогресс | localStorage: уроки, ошибки, XP, серия, расписание повторения, достижения, дата старта триала, ключ Premium |
| Оплата | Вход через Telegram + **Telegram Stars (500 ⭐)**: invoice → вебхук → лицензионный ключ |
| SEO | robots.txt, sitemap.xml, Open Graph, Twitter cards, Schema.org (Course / LearningResource), метатеги каждого урока |
| PWA | manifest, service worker, офлайн-режим, установка на телефон |

## Стек

Next.js (App Router) · React 19 · TypeScript · Tailwind CSS v4 · компоненты в стиле shadcn/ui.

Обучение полностью офлайн (localStorage). Сервер + PostgreSQL нужны **только** для Telegram-входа,
оплаты звёздами и восстановления покупки. Если API недоступен, тренажёр продолжает работать локально,
а Premium активируется лицензионным ключом.

## Telegram: вход и оплата звёздами

Premium после урока 7 покупается за **500 Telegram Stars** (цена настраивается: `TELEGRAM_STARS_PRICE`).

### Настройка

1. Создайте бота у [@BotFather](https://t.me/BotFather) и скопируйте токен.
2. В BotFather выполните `/setdomain` и добавьте домен, на котором работает приложение
   (иначе виджет входа не загрузится).
3. Задайте переменные окружения:

```bash
TELEGRAM_BOT_TOKEN=123456:AA...
TELEGRAM_BOT_USERNAME=MyEspanolRealBot
TELEGRAM_STARS_PRICE=500
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

4. Один раз зарегистрируйте платёжный вебхук:

```bash
curl "https://your-domain.com/api/telegram/setup?secret=$TELEGRAM_BOT_TOKEN"
```

### Как это работает

```
Кнопка «Оплатить 500 ⭐»
   → POST /api/payments/telegram/stars        создаёт заказ + invoice link (createInvoiceLink, XTR)
   → Telegram.WebApp.openInvoice() / новая вкладка
   → Telegram присылает pre_checkout_query    POST /api/telegram/webhook → answerPreCheckoutQuery
   → Telegram присылает successful_payment    POST /api/telegram/webhook → заказ = paid
   → сервер выдаёт лицензионный ключ (licenses) и пишет его пользователю в чат
   → клиент активирует ключ локально → все 45 уроков открыты
```

Резервная проверка без вебхука: `getStarTransactions` — сопоставление по payload
(`source.invoice_payload`), либо по сумме + дате + Telegram ID покупателя.

### Вход

* **Login Widget** (`data-onauth`) → `POST /api/telegram/auth` — подпись `hash` проверяется
  HMAC-SHA256 c ключом `SHA256(bot_token)`; бот-токен остаётся на сервере.
* **Mini App** → `POST /api/telegram/auth/init` с `Telegram.WebApp.initData`.
* Сессия — подписанная HttpOnly-cookie (`er_session`, HMAC, 30 дней), без таблицы сессий.
* Вход автоматически восстанавливает купленный Premium на любом устройстве.

### API

| Метод | Маршрут | Назначение |
| --- | --- | --- |
| POST | `/api/telegram/auth` | вход через Login Widget |
| GET | `/api/telegram/auth` | вход через redirect (`data-auth-url`) |
| DELETE | `/api/telegram/auth` | выход |
| POST | `/api/telegram/auth/init` | вход из Mini App (`initData`) |
| GET | `/api/telegram/session` | текущий аккаунт, состояние Premium, цена в звёздах |
| POST | `/api/payments/telegram/stars` | создать счёт на 500 ⭐ |
| GET/POST | `/api/payments/telegram/order` | статус заказа + выдача лицензии |
| POST | `/api/telegram/webhook` | подтверждение оплаты от Telegram |
| GET | `/api/telegram/setup` | регистрация вебхука (нужен `ADMIN_SECRET`) |
| POST | `/api/licenses/activate` | авторизованная проверка ключа |
| GET | `/api/lessons/[n]` | выдача полного урока по праву доступа |

### Защита платного контента

Серверная сборка не отдаёт фразы платных уроков в HTML: `/lesson/8…45` содержит только заголовок,
описание и 2 фразы-тизера (для индексации). Полный урок приходит из `GET /api/lessons/[n]`
после подтверждения права — либо по ключу `?key=`, либо по Telegram-сессии с оплаченным заказом.

* `PROTECT_PREMIUM_CONTENT=false` — отключить защиту (отдать всё в HTML).
* `STATIC_EXPORT=true` — защита автоматически выключается: офлайн-сборка содержит все уроки целиком.

Проверено тестом: в HTML нет фраз после тизера, авторского комментария и пула дистракторов
из других уроков.

Замена на Stripe или другой провайдер = замена одного файла
(`src/lib/payments/catalog.ts` + адаптер в `src/app/api/payments/...`), фронтенд не меняется.

### Проверка платежного флоу локально

Скрипт поднимает мок Telegram Bot API и проходит весь путь: вход → счёт → вебхук → лицензия.

```bash
npm run build
TELEGRAM_BOT_TOKEN=7000000001:test-token-for-local-mock \
TELEGRAM_API_URL=http://127.0.0.1:4010 \
SESSION_SECRET=test npx next start -p 3100 &

TELEGRAM_BOT_TOKEN=7000000001:test-token-for-local-mock \
TELEGRAM_API_URL=http://127.0.0.1:4010 \
node scripts/e2e-telegram-stars.mjs http://127.0.0.1:3100
```

Проверяется 29 утверждений: подпись Login Widget, отклонение подделанных данных, вход из Mini App
(`initData`), создание счёта на 500 ⭐, `pre_checkout_query`, `successful_payment`, выдача ключа,
соответствие ключа офлайн-чексумме, активация, отказ анониму и резервная проверка через
`getStarTransactions` без вебхука.

### Возвраты

```sql
-- найти заказ
SELECT id, payload, charge_id, status FROM orders WHERE user_id = <id>;
```
Затем `refundStarPayment(user_id, telegram_payment_charge_id)` и отметьте заказ как `refunded`.

## Добавление уроков (масштаб до 500+)

1. Положите JSON-файл в `data/lessons/` — например `lesson046.json` (или `lesson46.json`, вложенные папки тоже сканируются).
2. Соберите проект — урок автоматически появится в списке уроков, на карте адаптации, в поиске, в sitemap, в экзаменах и в прогрессе курса.

Никакого кода менять не нужно: маршруты, упражнения, экзамены, карта, статистика и SEO генерируются из данных.

Формат файла:

```json
{
  "lesson": 46,
  "slug": "mi-barrio",
  "title": "Mi barrio",
  "subtitle": "Короткое описание",
  "category": "daily-life",
  "milestone": "belonging",
  "difficulty": "B1",
  "tags": ["daily life"],
  "summary": "О чём урок",
  "situation": "Ситуация, в которой пригодится",
  "authorComment": "Комментарий автора метода",
  "phrases": [
    {
      "spanish": "Me cuentas",
      "translation": "Расскажешь мне",
      "example": "Lo haces y me cuentas.",
      "exampleTranslation": "Ты это делаешь, а потом расскажешь мне.",
      "notes": "Очень частая разговорная фраза.",
      "difficulty": "A1",
      "tags": ["daily life", "pronouns"]
    }
  ]
}
```

Справочники (категории, этапы адаптации, уровни, достижения, XP, цены, FAQ, отзывы, навигация)
лежат в `data/course.config.json` — тоже данные, а не код.

## Сборка и деплой

```bash
npm install
npm run dev                          # разработка
npm run build                        # полная сборка: Next-сервер + Telegram API + БД
npx drizzle-kit push                 # применить схему (telegram_users, orders, licenses)
node scripts/build-static.mjs        # чистый статический экспорт в ./out (офлайн-версия)
node scripts/e2e-telegram-stars.mjs  # e2e-проверка оплаты звёздами на мок-сервере
```

**Серверный режим** (нужен для Telegram-входа и оплаты звёздами): Render, Railway, Fly.io, Vercel,
Netlify Functions. Примените схему: `npx drizzle-kit push`.

**Статический режим**: `node scripts/build-static.mjs` временно убирает `src/app/api` (API-маршруты
нельзя экспортировать в статические файлы) и собирает чистый офлайн-тренажёр в `out/`. В нём доступны
все уроки, упражнения, прогресс и офлайн-активация лицензионного ключа.

Для GitHub Pages задайте `NEXT_PUBLIC_SITE_URL` перед сборкой — он используется в canonical, OG и sitemap.

## Лицензионные ключи

Stripe пока не подключён (по заданию). Вместо этого — офлайн-ключи:

```bash
node scripts/generate-license-keys.mjs 20          # 20 ключей
node scripts/generate-license-keys.mjs 5 --prefix=ESPA
```

Ключ вводится в разделе **Настройки → Premium**. Проверка (`src/lib/license.ts`) — контрольная сумма по алфавиту без похожих символов.
Опционально можно задать «мастер-ключ» в переменной `NEXT_PUBLIC_MASTER_LICENSE_KEY`.

## Архитектура (готовность к SaaS)

```
data/                     # весь контент (JSON)
src/lib/content/          # загрузчик контента (fs, только build-time) + типы + course.config
src/lib/exercises/        # генератор упражнений из фраз (данные → упражнения)
src/lib/srs.ts            # интервальное повторение
src/lib/progress/         # состояние, редьюсер, селекторы, localStorage
src/lib/license.ts        # адаптер монетизации (замена на Stripe = 1 файл)
src/components/trainer/   # движок тренировки (универсальный для уроков/экзаменов/повторения)
src/components/learn/     # экраны приложения
src/app/lesson/[n]        # статический URL /lesson/1 … /lesson/45
src/app/exam/[n]          # экзамены каждые 5 уроков
```

```
data/                     # весь контент (JSON)
src/lib/content/          # загрузчик контента (fs, только build-time) + типы + course.config
src/lib/exercises/        # генератор упражнений из фраз (данные → упражнения)
src/lib/srs.ts            # интервальное повторение
src/lib/progress/         # состояние, редьюсер, селекторы, localStorage
src/lib/telegram/         # проверка подписи, Bot API клиент, Mini App мост
src/lib/payments/catalog  # товары и цены (500 ⭐)
src/lib/session.ts        # подписанная cookie-сессия
src/lib/license.ts        # офлайн-проверка ключа
src/server/               # пользователи, заказы, лицензии, аккаунт-пейлоад
src/app/api/              # Telegram auth + Stars payment + webhook + licenses
src/components/trainer/   # движок тренировки (универсальный для уроков/экзаменов/повторения)
src/components/learn/     # экраны приложения
src/app/lesson/[n]        # статический URL /lesson/1 … /lesson/45
src/app/exam/[n]          # экзамены каждые 5 уроков
```

Чтобы добавить Supabase, Stripe, AI-диалоги, распознавание речи или учительскую панель, достаточно
заменить `src/lib/progress/storage.ts` (синхронизация) и `src/lib/payments/catalog.ts` (оплата) —
фронтенд и контент остаются без изменений.

## Права

Учебные материалы принадлежат автору учебника и защищены авторским правом.
