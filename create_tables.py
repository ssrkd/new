"""
Creates the new tables and runs the migration using Supabase REST API
"""
from backend.database import get_client

db = get_client()

# Create chat_sessions
try:
    result = db.rpc("exec_sql", {"sql": """
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
    """}).execute()
    print("Tables created via RPC")
except Exception as e:
    print(f"RPC failed (expected if RPC not available): {e}")

# Test if tables exist by trying to query
try:
    r = db.table("chat_sessions").select("id").limit(1).execute()
    print("chat_sessions exists!")
except Exception as e:
    print(f"chat_sessions error: {e}")

try:
    r = db.table("user_memory").select("id").limit(1).execute()
    print("user_memory exists!")
except Exception as e:
    print(f"user_memory error: {e}")
