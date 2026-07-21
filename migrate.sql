-- Delete duplicates from processed_articles keeping the most recent
DELETE FROM processed_articles a USING (
    SELECT MIN(ctid) as ctid, raw_article_id
    FROM processed_articles 
    GROUP BY raw_article_id HAVING COUNT(*) > 1
) b
WHERE a.raw_article_id = b.raw_article_id 
AND a.ctid <> b.ctid;

-- If there are still duplicates (if count > 2), run again or better:
DELETE FROM processed_articles
WHERE id NOT IN (
    SELECT DISTINCT ON (raw_article_id) id
    FROM processed_articles
    ORDER BY raw_article_id, created_at DESC
);

-- Add unique constraint
ALTER TABLE processed_articles DROP CONSTRAINT IF EXISTS unique_raw_article;
ALTER TABLE processed_articles ADD CONSTRAINT unique_raw_article UNIQUE (raw_article_id);

-- Create new tables
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Новый чат',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb,
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS user_memory (
  id int primary key default 1 check (id = 1),
  profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable realtime for processed_articles
alter publication supabase_realtime add table processed_articles;
