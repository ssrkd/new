import asyncio
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

new_sources = [
    {"name": "Курсив", "url": "https://kursiv.media/feed/", "category": "экономика", "type": "rss"},
    {"name": "Forbes Kazakhstan", "url": "https://forbes.kz/feed/", "category": "экономика", "type": "rss"},
    {"name": "LSM.kz", "url": "https://lsm.kz/rss", "category": "экономика", "type": "rss"},
    {"name": "КазТАГ", "url": "https://kaztag.kz/ru/news/rss/", "category": "казахстан", "type": "rss"},
    {"name": "BaigeNews", "url": "https://baigenews.kz/news/rss/", "category": "казахстан", "type": "rss"},
    {"name": "Inbusiness.kz", "url": "https://inbusiness.kz/rss", "category": "экономика", "type": "rss"},
    {"name": "Associated Press (AP)", "url": "https://apnews.com/hub/ap-top-news?output=rss", "category": "мир", "type": "rss"},
    {"name": "CNN World", "url": "http://rss.cnn.com/rss/edition_world.rss", "category": "мир", "type": "rss"},
    {"name": "CNBC", "url": "https://www.cnbc.com/id/100003114/device/rss/rss.html", "category": "экономика", "type": "rss"},
    {"name": "Financial Times", "url": "https://www.ft.com/?format=rss", "category": "экономика", "type": "rss"},
    {"name": "The Guardian", "url": "https://www.theguardian.com/world/rss", "category": "мир", "type": "rss"},
    {"name": "New York Times", "url": "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", "category": "мир", "type": "rss"},
    {"name": "Washington Post", "url": "https://feeds.washingtonpost.com/rss/world", "category": "мир", "type": "rss"},
    {"name": "Белый дом", "url": "https://www.whitehouse.gov/briefing-room/", "category": "мир", "type": "api"},
    {"name": "State Department", "url": "https://www.state.gov/rss-feeds/press-releases.xml", "category": "дипломатия", "type": "rss"},
    {"name": "Pentagon (DoD)", "url": "https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?max=10&Server=26866&categories=News&NewsId=1", "category": "безопасность", "type": "rss"},
    {"name": "FBI", "url": "https://www.fbi.gov/news/feed", "category": "безопасность", "type": "rss"},
    {"name": "CIA", "url": "https://www.cia.gov/readingroom/rss.xml", "category": "безопасность", "type": "rss"},
    {"name": "NASA", "url": "https://www.nasa.gov/rss/dyn/breaking_news.rss", "category": "мир", "type": "rss"},
    {"name": "Европейская комиссия", "url": "https://ec.europa.eu/commission/presscorner/api/rss?language=en&format=xml", "category": "дипломатия", "type": "rss"},
    {"name": "NATO", "url": "https://www.nato.int/cps/rss/en/natohq/rss.xml", "category": "безопасность", "type": "rss"},
    {"name": "Европарламент", "url": "https://www.europarl.europa.eu/rss/doc/top-stories/en.xml", "category": "дипломатия", "type": "rss"},
    {"name": "ООН", "url": "https://news.un.org/feed/subscribe/en/news/all/rss.xml", "category": "дипломатия", "type": "rss"},
    {"name": "WHO", "url": "https://www.who.int/rss-feeds/news-english.xml", "category": "мир", "type": "rss"},
    {"name": "IMF", "url": "https://www.imf.org/en/News/RSS", "category": "экономика", "type": "rss"},
    {"name": "World Bank", "url": "https://www.worldbank.org/en/news/all", "category": "экономика", "type": "api"},
    {"name": "ТАСС", "url": "http://tass.ru/rss/v2.xml", "category": "мир", "type": "rss"},
    {"name": "РИА Новости", "url": "https://ria.ru/export/rss2/archive/index.xml", "category": "мир", "type": "rss"},
    {"name": "Коммерсант", "url": "https://www.kommersant.ru/RSS/news.xml", "category": "экономика", "type": "rss"},
    {"name": "РБК", "url": "https://rssexport.rbc.ru/rbcnews/news/30/full.rss", "category": "экономика", "type": "rss"},
]

for s in new_sources:
    try:
        supabase.table("sources").insert(s).execute()
        print(f"Added {s['name']}")
    except Exception as e:
        print(f"Failed to add {s['name']}: {e}")

print("Done!")
