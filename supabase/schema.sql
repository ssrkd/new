-- ============================================================
-- Дипломатическая аналитическая платформа — Supabase Schema
-- pgvector(768) — paraphrase-multilingual-mpnet-base-v2
-- ============================================================

-- Enable pgvector extension
create extension if not exists vector;

-- ── Sources ──────────────────────────────────────────────────
create table if not exists sources (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  url         text not null,
  type        text not null check (type in ('rss', 'telegram', 'api')),
  category    text not null check (category in ('казахстан', 'мир', 'дипломатия', 'экономика', 'безопасность')),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ── Raw articles ──────────────────────────────────────────────
create table if not exists raw_articles (
  id            uuid primary key default gen_random_uuid(),
  source_id     uuid references sources(id) on delete set null,
  title         text,
  content       text,
  url           text unique,
  published_at  timestamptz,
  fetched_at    timestamptz not null default now(),
  is_processed  boolean not null default false
);

create index if not exists raw_articles_is_processed_idx on raw_articles(is_processed);
create index if not exists raw_articles_source_id_idx on raw_articles(source_id);
create index if not exists raw_articles_published_at_idx on raw_articles(published_at desc);

-- ── Processed articles ────────────────────────────────────────
create table if not exists processed_articles (
  id                uuid primary key default gen_random_uuid(),
  raw_article_id    uuid references raw_articles(id) on delete cascade,
  summary           text,
  tags              text[],
  entities          jsonb,
  importance        text check (importance in ('low', 'medium', 'high')),
  importance_reason text,
  embedding         vector(768),
  created_at        timestamptz not null default now()
);

-- IVFFlat index for fast cosine similarity search
create index if not exists processed_articles_embedding_idx
  on processed_articles using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists processed_articles_importance_idx on processed_articles(importance);
create index if not exists processed_articles_created_at_idx on processed_articles(created_at desc);

-- ── Digests ───────────────────────────────────────────────────
create table if not exists digests (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  category    text,
  content     text,
  created_at  timestamptz not null default now()
);

create index if not exists digests_date_idx on digests(date desc);

-- ── Function: match_documents ─────────────────────────────────
-- Cosine similarity search for RAG
create or replace function match_documents(
  query_embedding  vector(768),
  match_threshold  float default 0.3,
  match_count      int   default 10
)
returns table (
  id                uuid,
  raw_article_id    uuid,
  summary           text,
  tags              text[],
  entities          jsonb,
  importance        text,
  importance_reason text,
  similarity        float,
  -- from join with raw_articles
  title             text,
  url               text,
  published_at      timestamptz,
  source_name       text,
  category          text
)
language sql stable
as $$
  select
    pa.id,
    pa.raw_article_id,
    pa.summary,
    pa.tags,
    pa.entities,
    pa.importance,
    pa.importance_reason,
    1 - (pa.embedding <=> query_embedding) as similarity,
    ra.title,
    ra.url,
    ra.published_at,
    s.name  as source_name,
    s.category
  from processed_articles pa
  join raw_articles ra on ra.id = pa.raw_article_id
  join sources s on s.id = ra.source_id
  where 1 - (pa.embedding <=> query_embedding) > match_threshold
  order by pa.embedding <=> query_embedding
  limit match_count;
$$;

-- ── Seed: default sources ─────────────────────────────────────
insert into sources (name, url, type, category) values
  ('Kazinform',       'https://www.inform.kz/rss/',                          'rss',      'казахстан'),
  ('Tengrinews KZ',   'https://tengrinews.kz/rss/',                          'rss',      'казахстан'),
  ('Zakon.kz',        'https://www.zakon.kz/rss.xml',                        'rss',      'казахстан'),
  ('Reuters World',   'https://feeds.reuters.com/reuters/worldNews',          'rss',      'мир'),
  ('Reuters Politics','https://feeds.reuters.com/reuters/politicsNews',       'rss',      'дипломатия'),
  ('Interfax.ru',     'https://www.interfax.ru/rss.asp',                      'rss',      'мир'),
  ('GDELT',           'https://api.gdeltproject.org/api/v2/doc/doc?query=Kazakhstan&mode=artlist&format=rss', 'rss', 'дипломатия'),
  ('Al Jazeera',      'https://www.aljazeera.com/xml/rss/all.xml',           'rss',      'мир'),
  ('BBC World',       'https://feeds.bbci.co.uk/news/world/rss.xml',         'rss',      'мир')
on conflict do nothing;

-- ── Chat & Memory (Real-time updates) ─────────────────────────
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

-- Enable Realtime for processed_articles
alter publication supabase_realtime add table processed_articles;
