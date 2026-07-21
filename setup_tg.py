import httpx
import time
import sys
import re

TOKEN = "8625561904:AAG-nOP532tMvjC39shR_QYY9jXlXwa8xcw"
URL = f"https://api.telegram.org/bot{TOKEN}/getUpdates"

print("Ожидаю сообщение в Telegram бот...")
print("Пожалуйста, напиши любое сообщение (например 'Привет') своему боту в Telegram.")

offset = None
chat_id = None

for _ in range(60): # Ждем до 5 минут (60 раз по 5 сек)
    try:
        params = {"timeout": 10, "offset": offset}
        r = httpx.get(URL, params=params)
        data = r.json()
        
        if data.get("ok") and data.get("result"):
            for update in data["result"]:
                offset = update["update_id"] + 1
                if "message" in update:
                    chat_id = update["message"]["chat"]["id"]
                    first_name = update["message"]["chat"].get("first_name", "User")
                    print(f"✅ Найдено сообщение от {first_name}! Chat ID: {chat_id}")
                    
                    # Обновляем config.py
                    with open("backend/config.py", "r", encoding="utf-8") as f:
                        config_content = f.read()
                    
                    new_content = re.sub(
                        r'telegram_chat_id:\s*str\s*=\s*".*"',
                        f'telegram_chat_id: str = "{chat_id}"',
                        config_content
                    )
                    
                    with open("backend/config.py", "w", encoding="utf-8") as f:
                        f.write(new_content)
                        
                    print("✅ config.py успешно обновлен!")
                    
                    # Отправляем подтверждение в бота
                    httpx.post(f"https://api.telegram.org/bot{TOKEN}/sendMessage", json={
                        "chat_id": chat_id,
                        "text": "🤖 Интеграция с Diplomat Analytics успешно настроена!\nТеперь сюда будут приходить ВАЖНЫЕ новости про Казахстан."
                    })
                    sys.exit(0)
    except Exception as e:
        print("Ошибка при запросе:", e)
        
    time.sleep(5)

print("Время ожидания истекло. Запусти скрипт снова, когда будешь готов отправить сообщение.")
