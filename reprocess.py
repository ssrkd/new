from backend.database import get_client
db = get_client()
db.table("processed_articles").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
db.table("raw_articles").update({"is_processed": False}).neq("id", "00000000-0000-0000-0000-000000000000").execute()
print("Reset complete.")
