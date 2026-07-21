import React, { useState, useEffect, useCallback } from 'react';
import { getArticles } from '../api';
import ArticleCard from '../components/ArticleCard';
import { supabase } from '../supabase';

const CATEGORIES = [
  { key: '', label: 'Все' },
  { key: 'казахстан', label: 'Казахстан' },
  { key: 'мир', label: 'Мир' },
  { key: 'дипломатия', label: 'Дипломатия' },
  { key: 'экономика', label: 'Экономика' },
  { key: 'безопасность', label: 'Безопасность' },
  // Один таб для всех госорганов (Акорда, МВД, КНБ, Антикор, АФМ, Прокуратура)
  { key: 'gov', label: 'МВД' },
];
const GOV_SOURCES = [
  'Акорда', 'МВД Казахстана', 'КНБ Казахстана',
  'Антикор Казахстана', 'АФМ Казахстана', 'Генеральная Прокуратура РК'
];
const PAGE_SIZE = 20;

export default function Feed() {
  const [articles, setArticles] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const [longLoading, setLongLoading] = useState(false);

  // Filters
  const [category, setCategory] = useState('');
  const [importance, setImportance] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [govFilter, setGovFilter] = useState(false);

  // Article Modal
  const [selectedArticle, setSelectedArticle] = useState(null);

  const fetchArticlesFromSupabase = async (off = 0) => {
    let q = supabase
      .from('processed_articles')
      .select(`
        id, raw_article_id, summary, tags, entities, importance, importance_reason, created_at,
        raw_articles!inner(id, title, url, content, published_at, source_id,
          sources!inner(name, category)
        )
      `, { count: 'exact' });

    if (importance) q = q.eq('importance', importance);
    if (category) {
      const catLower = category.toLowerCase();
      const catCap = category.charAt(0).toUpperCase() + category.slice(1);
      q = q.or(`tags.cs.{${catLower}},tags.cs.{${catCap}}`);
    }
    if (sourceId) q = q.eq('raw_articles.source_id', sourceId);
    
    if (govFilter) {
      const { data: sourcesData } = await supabase
        .from('sources')
        .select('id')
        .in('name', GOV_SOURCES);
      if (sourcesData && sourcesData.length > 0) {
        const ids = sourcesData.map(s => s.id);
        q = q.in('raw_articles.source_id', ids);
      } else {
        q = q.in('raw_articles.source_id', ['none']);
      }
    }

    // We order by created_at desc for pagination
    q = q.order('created_at', { ascending: false });
    q = q.range(off, off + PAGE_SIZE - 1);

    const { data, count, error } = await q;
    if (error) throw new Error(error.message);

    // Local JS sort by published_at
    const sorted = [...(data || [])].sort((a, b) => {
      const dateA = new Date(a.raw_articles?.published_at || a.created_at);
      const dateB = new Date(b.raw_articles?.published_at || b.created_at);
      return dateB - dateA;
    });

    const mapped = sorted.map(d => ({
      id: d.id,
      raw_article_id: d.raw_article_id,
      title: d.raw_articles?.title,
      url: d.raw_articles?.url,
      content: d.raw_articles?.content,
      published_at: d.raw_articles?.published_at,
      source_name: d.raw_articles?.sources?.name,
      summary: d.summary,
      tags: d.tags,
      entities: d.entities,
      importance: d.importance,
      importance_reason: d.importance_reason,
      created_at: d.created_at
    }));

    return { items: mapped, total: count || 0 };
  };

  const load = useCallback(async (off = 0) => {
    setLoading(true);
    setError('');
    
    try {
      const data = await fetchArticlesFromSupabase(off);
      setArticles(data.items || []);
      setTotal(data.total || 0);
      setOffset(off);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [category, importance, sourceId, govFilter]);

  const loadSilent = useCallback(async (off = 0) => {
    try {
      const data = await fetchArticlesFromSupabase(off);
      setArticles(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      // ignore background errors
    }
  }, [category, importance, sourceId, govFilter]);

  useEffect(() => { 
    load(0); 
    // Silently ping backend to wake it up for background scraping
    fetch(import.meta.env.VITE_API_BASE_URL + '/api/sources').catch(() => {});
  }, [load]);

  // Real-time subscription via Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel('processed_articles_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'processed_articles' }, () => {
        // Silently refresh when new articles appear
        loadSilent(0);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadSilent]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-header-title">Новостная лента</h1>
        {!loading && (
          <span style={{ fontSize: 12, color: 'var(--c-text-3)' }}>
            {total} статей
          </span>
        )}
      </div>

      <div className="page-content">
        {/* Filters */}
        <div style={{ marginBottom: 16 }}>
          {/* Category & Source tabs combined */}
          <div className="filter-chips" style={{ marginBottom: 10 }}>
            {CATEGORIES.map(({ key, label }) => {
              if (key === 'gov') {
                // Special МВД tab — filters all gov sources at once
                return (
                  <button
                    key="gov"
                    className={`filter-chip${govFilter ? ' active' : ''}`}
                    onClick={() => { setCategory(''); setSourceId(''); setGovFilter(true); }}
                  >
                    {label}
                  </button>
                );
              }
              return (
                <button
                  key={`cat-${key}`}
                  className={`filter-chip${(category === key && sourceId === '' && !govFilter) ? ' active' : ''}`}
                  onClick={() => { setCategory(key); setSourceId(''); setGovFilter(false); }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Importance filter */}
          <div className="filter-chips" style={{ marginBottom: 10 }}>
            {[
              { key: '', label: 'Любая важность' },
              { key: 'high', label: 'Высокая' },
              { key: 'medium', label: 'Средняя' },
              { key: 'low', label: 'Низкая' },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`filter-chip${importance === key ? ' active' : ''}`}
                style={key === 'high' ? { '--chip-active-bg': '#FF3B30' } : key === 'medium' ? { '--chip-active-bg': '#FF9500' } : {}}
                onClick={() => setImportance(key)}
              >
                {key === 'high' && importance === 'high' ? '▲ ' : key === 'medium' && importance === 'medium' ? '● ' : ''}{label}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: '12px 16px', background: '#FFF0EE', border: '1px solid #FFD0CC', borderRadius: 10, color: '#FF3B30', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div className="spinner" style={{ width: 28, height: 28 }} />
          </div>
        )}

        {/* Empty state */}
        {!loading && articles.length === 0 && !error && (
          <div className="empty-state">
            <div className="empty-state-icon" />
            <h2>Статей пока нет</h2>
            <p>Запустите сбор новостей через кнопку "Собрать сейчас" в боковом меню, или подождите автоматического обновления.</p>
          </div>
        )}

        {/* Articles */}
        {!loading && articles.length > 0 && (
          <>
            <div className="articles-grid">
              {articles.map(art => (
                <ArticleCard key={art.id} article={art} onClick={setSelectedArticle} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="btn btn-secondary"
                  style={{ padding: '6px 14px', fontSize: 12 }}
                  disabled={currentPage === 1}
                  onClick={() => load(offset - PAGE_SIZE)}
                >← Назад</button>
                <span className="pagination-info">
                  Страница {currentPage} из {totalPages}
                </span>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '6px 14px', fontSize: 12 }}
                  disabled={currentPage === totalPages}
                  onClick={() => load(offset + PAGE_SIZE)}
                >Вперёд →</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Article Modal */}
      {selectedArticle && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setSelectedArticle(null)}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div
            style={{
              position: 'relative',
              width: 600, maxWidth: '90%', maxHeight: '90vh', background: '#ffffff',
              borderRadius: 16, padding: '24px 32px',
              display: 'flex', flexDirection: 'column', gap: 16,
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
              overflowY: 'auto',
              animation: 'fadeIn 0.2s ease',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--c-text)', margin: 0, lineHeight: 1.4 }}>
                {selectedArticle.title || 'Без заголовка'}
              </h2>
              <button
                onClick={() => setSelectedArticle(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-3)', fontSize: 24, padding: '0 4px', lineHeight: 1 }}
              >×</button>
            </div>
            
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12, color: 'var(--c-text-3)' }}>
              {selectedArticle.source_name && <span>{selectedArticle.source_name}</span>}
              {selectedArticle.published_at && (
                <>
                  <span>·</span>
                  <span>{new Date(selectedArticle.published_at).toLocaleString('ru', { timeZone: 'Asia/Almaty' })}</span>
                </>
              )}
            </div>

            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text)', marginTop: 12 }}>
              Краткое содержание:
            </div>
            <div style={{ fontSize: 14, color: 'var(--c-text-2)', lineHeight: 1.6, marginTop: 4, whiteSpace: 'pre-wrap', background: 'var(--c-subtle)', padding: 12, borderRadius: 8 }}>
              {selectedArticle.summary || 'Нет содержания.'}
            </div>

            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text)', marginTop: 16 }}>
              Полный текст новости:
            </div>
            <div style={{ fontSize: 15, color: 'var(--c-text)', lineHeight: 1.6, marginTop: 4, whiteSpace: 'pre-wrap' }}>
              {selectedArticle.content || 'Полный текст не загружен.'}
            </div>

            {selectedArticle.tags && selectedArticle.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                {selectedArticle.tags.map((t, i) => (
                  <span key={i} className="tag">{t}</span>
                ))}
              </div>
            )}

            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--c-border)', display: 'flex', justifyContent: 'flex-end' }}>
              <a
                href={selectedArticle.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ textDecoration: 'none' }}
              >
                Читать источник
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ marginLeft: 6 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
