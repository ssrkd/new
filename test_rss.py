import requests

urls = [
    "https://www.akorda.kz/ru/feeds/rss",
    "https://www.gov.kz/memleket/entities/knb/rss",
    "https://www.gov.kz/memleket/entities/mvd/rss",
    "https://www.gov.kz/memleket/entities/anticorruption/rss",
    "https://www.gov.kz/memleket/entities/afm/rss",
    "https://www.gov.kz/memleket/entities/prokuror/rss"
]

for url in urls:
    try:
        r = requests.get(url, timeout=5, verify=False)
        print(f"{url}: {r.status_code}")
    except Exception as e:
        print(f"{url}: {e}")
