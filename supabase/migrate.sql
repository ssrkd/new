-- 1. Удаление дубликатов
DELETE FROM processed_articles a USING (
    SELECT MIN(ctid) as ctid, raw_article_id
    FROM processed_articles 
    GROUP BY raw_article_id HAVING COUNT(*) > 1
) b
WHERE a.raw_article_id = b.raw_article_id 
AND a.ctid <> b.ctid;

-- 2. Добавление UNIQUE constraint для предотвращения дубликатов в будущем
ALTER TABLE processed_articles DROP CONSTRAINT IF EXISTS unique_raw_article;
ALTER TABLE processed_articles ADD CONSTRAINT unique_raw_article UNIQUE (raw_article_id);

-- 3. Создание таблиц для истории чатов и памяти
create table if not exists chat_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Новый чат',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb,
  created_at timestamptz not null default now()
);

create table if not exists user_memory (
  id int primary key default 1 check (id = 1),
  profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Включение Real-time для авто-обновления ленты новостей
alter publication supabase_realtime add table processed_articles;

-- 5. Добавление источников новостей
INSERT INTO sources (name, url, type, category) VALUES
('Tengrinews (Мир)', 'https://tengrinews.kz/world_news/rss/', 'rss', 'мир'),
('Zakon.kz (Политика)', 'https://www.zakon.kz/rss/politics.xml', 'rss', 'казахстан'),
('Vlast.kz', 'https://vlast.kz/rss', 'rss', 'казахстан')
ON CONFLICT DO NOTHING;
