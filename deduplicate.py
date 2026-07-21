from backend.database import get_client
db = get_client()

# Fetch all processed articles
print("Fetching articles...")
response = db.table("processed_articles").select("id, raw_article_id, created_at").execute()
articles = response.data

seen = {}
to_delete = []

for art in articles:
    raw_id = art["raw_article_id"]
    if raw_id not in seen:
        seen[raw_id] = art
    else:
        # keep the most recently created one
        existing = seen[raw_id]
        if art["created_at"] > existing["created_at"]:
            to_delete.append(existing["id"])
            seen[raw_id] = art
        else:
            to_delete.append(art["id"])

print(f"Found {len(to_delete)} duplicates out of {len(articles)} total processed articles.")
if to_delete:
    for did in to_delete:
        db.table("processed_articles").delete().eq("id", did).execute()
    print("Deleted duplicates.")
