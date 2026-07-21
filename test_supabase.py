from backend.database import get_client
db = get_client()
q = db.table("processed_articles").select("id").or_(f"tags.cs.{{Казахстан}},tags.cs.{{казахстан}}").execute()
print(q.data)
