-- Миграция: добавить тип 'scraper' в sources и добавить госорганы

-- 1. Обновляем constraint на type — добавляем 'scraper'
ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_type_check;
ALTER TABLE sources ADD CONSTRAINT sources_type_check 
  CHECK (type IN ('rss', 'telegram', 'api', 'scraper'));

-- 2. Добавляем источники госорганов РК
INSERT INTO sources (name, url, type, category, active) VALUES
  ('Акорда',                   'https://www.akorda.kz/ru/news',                                             'scraper', 'казахстан',   true),
  ('МВД Казахстана',           'https://www.gov.kz/memleket/entities/mvd/press/news',                       'scraper', 'безопасность', true),
  ('КНБ Казахстана',           'https://www.gov.kz/memleket/entities/knb/press/news',                       'scraper', 'безопасность', true),
  ('Антикор Казахстана',       'https://www.gov.kz/memleket/entities/anticorruption/press/news',            'scraper', 'казахстан',   true),
  ('АФМ Казахстана',           'https://www.gov.kz/memleket/entities/afm/press/news',                       'scraper', 'экономика',   true),
  ('Генеральная Прокуратура РК','https://prokuror.gov.kz/ru/news',                                          'scraper', 'безопасность', true)
ON CONFLICT DO NOTHING;
