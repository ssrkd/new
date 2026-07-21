import React from 'react';

const IMPORTANCE_LABEL = { high: 'Важно', medium: 'Среднее', low: 'Инфо' };

function ImportanceBadge({ importance }) {
  if (!importance) return null;
  return (
    <span className={`badge badge-${importance}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {importance === 'high' && (
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )}
      {importance === 'medium' && (
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      {importance === 'low' && (
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      )}
      {IMPORTANCE_LABEL[importance] || importance}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  // Time in Almaty
  const timeStr = d.toLocaleTimeString('ru', {
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Almaty',
  });

  if (isToday) {
    return `Сегодня, ${timeStr}`;
  }

  return d.toLocaleDateString('ru', {
    day: 'numeric', month: 'short', year: 'numeric',
    timeZone: 'Asia/Almaty',
  }) + `, ${timeStr}`;
}

export default function ArticleCard({ article, onClick }) {
  const {
    title, summary, url, source_name, category,
    published_at, importance, tags,
  } = article;

  return (
    <div
      className="article-card"
      onClick={() => onClick && onClick(article)}
      style={{ cursor: 'pointer' }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
        <h2 className="article-card-title" style={{ margin: 0 }}>{title || 'Без заголовка'}</h2>
        <ImportanceBadge importance={importance} />
      </div>

      {/* Summary */}
      {summary && (
        <p className="article-card-summary">{summary}</p>
      )}

      {/* Tags */}
      {tags && tags.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
          {tags.slice(0, 5).map((t, i) => (
            <span key={i} className="tag">{t}</span>
          ))}
        </div>
      )}

      {/* Meta */}
      <div className="article-card-meta">
        {source_name && <span className="meta-chip">{source_name}</span>}
        {source_name && category && <span className="meta-dot" />}
        {category && <span className="meta-chip" style={{ textTransform: 'capitalize' }}>{category}</span>}
        {published_at && (
          <>
            <span className="meta-dot" />
            <span className="meta-chip">{formatDate(published_at)}</span>
          </>
        )}
      </div>
    </div>
  );
}
