"""
Run Supabase migration using the service key (admin access).
Executes raw SQL via the Supabase REST API.
"""
import httpx
import sys

SUPABASE_URL = "https://hylxsvonqspexprqcguh.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5bHhzdm9ucXNwZXhwcnFjZ3VoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0MzE3NCwiZXhwIjoyMDY4NjE5MTc0fQ.IvlXG0NcQDK4YJeL5U6X5Rk38rwKE0N1Iimz3PVAJJQ"

headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

GOV_SOURCES = [
    {"name": "Акорда",                    "url": "https://www.akorda.kz/ru/news",                                 "type": "scraper", "category": "казахстан",    "active": True},
    {"name": "МВД Казахстана",            "url": "https://www.gov.kz/memleket/entities/mvd/press/news",            "type": "scraper", "category": "безопасность", "active": True},
    {"name": "КНБ Казахстана",            "url": "https://www.gov.kz/memleket/entities/knb/press/news",            "type": "scraper", "category": "безопасность", "active": True},
    {"name": "Антикор Казахстана",        "url": "https://www.gov.kz/memleket/entities/anticorruption/press/news","type": "scraper", "category": "казахстан",    "active": True},
    {"name": "АФМ Казахстана",            "url": "https://www.gov.kz/memleket/entities/afm/press/news",            "type": "scraper", "category": "экономика",    "active": True},
    {"name": "Генеральная Прокуратура РК","url": "https://prokuror.gov.kz/ru/news",                                "type": "scraper", "category": "безопасность", "active": True},
]

def run():
    # Step 1: ALTER constraint
    print("Step 1: Update sources type constraint...")
    sql = """
    ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_type_check;
    ALTER TABLE sources ADD CONSTRAINT sources_type_check 
      CHECK (type IN ('rss', 'telegram', 'api', 'scraper'));
    """
    r = httpx.post(
        f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
        headers=headers,
        json={"sql": sql},
        timeout=20,
    )
    # exec_sql might not exist; we'll use pg REST approach below instead
    print(f"  result: {r.status_code} {r.text[:200]}")

    # Step 2: Insert gov sources directly via REST upsert
    print("\nStep 2: Insert gov sources...")
    for src in GOV_SOURCES:
        r = httpx.post(
            f"{SUPABASE_URL}/rest/v1/sources",
            headers={**headers, "Prefer": "return=representation,resolution=ignore-duplicates"},
            json=src,
            timeout=20,
        )
        if r.status_code in (200, 201):
            print(f"  ✓ Added: {src['name']}")
        elif r.status_code == 409:
            print(f"  ~ Exists: {src['name']}")
        else:
            print(f"  ✗ Failed {src['name']}: {r.status_code} {r.text[:300]}")

if __name__ == "__main__":
    run()
