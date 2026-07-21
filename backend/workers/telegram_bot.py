import httpx
import logging

logger = logging.getLogger(__name__)

# Чтобы легко менять логику фильтрации:
def should_notify(article: dict) -> bool:
    """
    Определяет, нужно ли отправлять статью в Telegram.
    По заданию: только ВАЖНЫЕ новости (про Казахстан можно фильтровать по тегам).
    """
    importance = article.get("importance", "low")
    tags = [t.lower() for t in article.get("tags", [])]
    
    # Отправляем если важность высокая
    # По заданию: только про Казахстан и только ВАЖНЫЕ
    if "казахстан" not in tags:
        return False

    if importance == "high":
        return True
        
    return False


def send_telegram_notification(article: dict, raw_url: str):
    """
    Отправляет уведомление в Telegram через API бота.
    """
    from backend.config import get_settings
    settings = get_settings()
    
    bot_token = getattr(settings, "telegram_bot_token", None)
    chat_id = getattr(settings, "telegram_chat_id", None)

    if not bot_token or not chat_id:
        logger.debug("Telegram credentials not fully configured (token or chat_id missing).")
        return

    # Формируем текст сообщения
    title = article.get("summary", "Новость без заголовка")[:100]
    tags = ", ".join(article.get("tags", []))
    reason = article.get("importance_reason", "")
    
    message = f"🚨 **ВАЖНАЯ НОВОСТЬ**\n\n"
    message += f"**{title}**\n\n"
    if reason:
        message += f"💡 _Почему это важно:_ {reason}\n\n"
    if tags:
        message += f"🏷 Тэги: {tags}\n\n"
        
    message += f"🔗 [Читать источник]({raw_url})"

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "Markdown"
    }

    try:
        r = httpx.post(url, json=payload, timeout=10)
        r.raise_for_status()
        logger.info("Успешно отправлено уведомление в Telegram.")
    except Exception as e:
        logger.error(f"Ошибка при отправке в Telegram: {e}")
