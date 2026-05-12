
# HSK 3 — онлайн-тренажёр

Веб‑приложение для подготовки к HSK 3 **на русском языке**. Работает полностью в браузере, хранит прогресс в `localStorage`.

## Запуск локально

```bash
npm install
npm run dev
```

Сборка:

```bash
npm run build
npm run preview
```

## Данные (JSON)

Все данные лежат в `src/data/`:

- `words.json`: 600 слов (HSK 1–3) + темы + поля под примеры
- `grammar.json`: 22 конструкции HSK 3 (объяснения + упражнения)
- `listening.json`: 40 упражнений по формату аудирования
- `reading.json`: 30 упражнений по формату чтения
- `writing.json`: 30+ упражнений письма (в т.ч. top‑30 иероглифов)

## TTS (озвучка)

Используется Web Speech API (браузерный синтез речи). Качество и наличие китайских голосов зависит от ОС/браузера.

## Прогресс (localStorage)

Ключи по умолчанию:

- `hsk_words_progress`
- `hsk_grammar_progress`
- `hsk_exam_results`
- `hsk_streak`
- `hsk_exam_date`
- `hsk_daily_sessions`

## Деплой

### Vercel (рекомендуется)

Импортируйте репозиторий в Vercel.

- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- Конфиг SPA‑роутинга уже добавлен в `vercel.json`

## Рекомендованный публичный запуск (домен + SSL)

Лучший вариант для простого и стабильного запуска:

1. Купить домен в **Cloudflare Registrar**.
2. Хостинг приложения сделать на **Vercel**.
3. Подключить домен из Cloudflare к Vercel.

Почему так:

- у Cloudflare обычно минимальная наценка на домен;
- SSL-сертификат для сайта выпускается автоматически (Let's Encrypt через Vercel);
- DNS и управление доменом удобные и быстрые.

### Быстрый порядок настройки

1. Залейте проект в GitHub.
2. В Vercel нажмите **New Project** и импортируйте репозиторий.
3. После первого деплоя откройте `Settings -> Domains` и добавьте ваш домен.
4. Vercel покажет DNS-записи, которые нужно добавить в Cloudflare.
5. После обновления DNS SSL подключится автоматически, сайт откроется по `https://`.
6. Включите в Vercel `Enforce HTTPS` и редирект с `www` на основной домен.

### После покупки домена

Замените `YOUR_DOMAIN` в двух файлах:

- `public/robots.txt`
- `public/sitemap.xml`

Пример: `hsk-prep.ru`

>>>>>>> 950873c (Initial commit)
