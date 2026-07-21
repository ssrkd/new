# Дипломатическая аналитическая платформа

Персональная платформа для мониторинга мировых и казахстанских новостей с дипломатическим/МО-анализом.

- **Backend:** FastAPI + APScheduler (Python)
- **Frontend:** React + Vite
- **БД:** Supabase (Postgres + pgvector)
- **LLM:** OpenRouter (Gemini 2.5 Flash) → Groq (Llama 3.3 70B) fallback
- **Embedding:** `paraphrase-multilingual-mpnet-base-v2` (локально, без API)

---

## Структура

```
├── backend/           # FastAPI
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── embeddings.py
│   ├── llm_client.py
│   ├── models.py
│   ├── routers/       # articles, ask, digest, sources, admin
│   └── workers/       # ingestion, processing, scheduler
├── frontend/          # React + Vite
│   └── src/
│       ├── pages/     # Feed, Digest, Ask, Sources
│       └── components/ # Sidebar, ArticleCard
├── supabase/
│   └── schema.sql     # DDL с pgvector
└── .env.example
```

---

## 1. Настройка базы данных (Supabase)

1. Создай новый проект на [supabase.com](https://supabase.com)
2. Перейди в **SQL Editor** и выполни:
   ```sql
   -- скопируй содержимое supabase/schema.sql
   ```
3. Скопируй `Project URL` и `service_role` ключ из **Settings → API**

---

## 2. Настройка окружения

```bash
cp .env.example .env
# Заполни SUPABASE_URL и SUPABASE_SERVICE_KEY
```

---

## 3. Запуск Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Из корня проекта:
cd ..
uvicorn backend.main:app --reload --port 8000
```

> При первом запуске скачается embedding-модель (~420 MB). Один раз, потом кэшируется.

API документация: http://localhost:8000/docs

---

## 4. Запуск Frontend

```bash
cd frontend
npm install
npm run dev
# Открой http://localhost:5173
```

---

## 5. Настройка Telegram (опционально)

1. Получи `API_ID` и `API_HASH` на https://my.telegram.org
2. Добавь в `.env`
3. При первом запуске backend авторизуйся интерактивно в терминале (телефон + OTP)
4. Добавь Telegram-каналы как источники типа `telegram` через UI (URL вида `https://t.me/channel_name`)

---

## 6. Ручные команды

### Принудительный сбор новостей
```bash
curl -X POST http://localhost:8000/api/admin/ingest
```

### Принудительная LLM-обработка
```bash
curl -X POST http://localhost:8000/api/admin/process
```

Или используй кнопки **"Собрать сейчас"** / **"Обработать LLM"** в сайдбаре UI.

---

## 7. Функции платформы

| Страница | Функционал |
|---|---|
| **Лента** | Карточки статей с фильтрами по категории, важности, источнику |
| **Дайджест** | Аккордеон по 5 категориям, кнопка "Сгенерировать заново" |
| **Поиск** | RAG-вопрос → ответ дипломатического аналитика + источники |
| **Источники** | CRUD: RSS/Telegram/API, toggle активации |

---

## 8. Расписание

- Каждые **30 минут** — сбор новых статей из всех активных источников
- Каждые **35 минут** — LLM-обработка (batch из 50 статей)

Настраивается через `.env`: `INGESTION_INTERVAL_MINUTES`, `PROCESSING_INTERVAL_MINUTES`
