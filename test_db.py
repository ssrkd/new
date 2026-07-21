from backend.database import get_client
db = get_client()
res = db.table("chat_sessions").select("*").execute()
print("CHATS:", res.data)
