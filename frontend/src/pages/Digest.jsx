import React, { useState, useEffect } from 'react';
import { getDailyDigest, generateDailyDigest } from '../api';

const CATEGORY_ICON = {
  казахстан: (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
    </svg>
  ),
  мир: (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
  дипломатия: (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  экономика: (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  безопасность: (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
};

function MarkdownRenderer({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Check if line is a list item (* or -)
    const isListItem = line.trim().startsWith('* ') || line.trim().startsWith('- ');
    if (isListItem) {
      line = line.replace(/^[\*\-]\s+/, '');
    }

    // Bold text parsing
    const parts = line.split(/(\*\*.*?\*\*)/g).map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    if (isListItem) {
      elements.push(
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <span style={{ color: 'var(--c-text-3)', flexShrink: 0, marginTop: 2 }}>•</span>
          <div style={{ fontSize: 14, color: 'var(--c-text-2)', lineHeight: 1.6 }}>{parts}</div>
        </div>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={i} style={{ height: 8 }} />);
    } else {
      elements.push(
        <p key={i} style={{ fontSize: 14, color: 'var(--c-text-2)', lineHeight: 1.65, margin: '4px 0' }}>
          {parts}
        </p>
      );
    }
  }
  return <div>{elements}</div>;
}

function AccordionItem({ category, content, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="accordion-item">
      <div className="accordion-header" onClick={() => setOpen(o => !o)}>
        <span className="accordion-title">
          <span style={{ color: 'var(--c-accent)', display: 'flex', alignItems: 'center' }}>
            {CATEGORY_ICON[category] || (
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
          </span>
          &ensp;<span style={{ textTransform: 'capitalize' }}>{category}</span>
        </span>
        <svg
          className={`accordion-chevron${open ? ' open' : ''}`}
          width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {open && (
        <div className="accordion-body fade-in">
          <MarkdownRenderer text={content} />
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00+05:00');
  return d.toLocaleDateString('ru', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'Asia/Almaty',
  });
}

function formatTime() {
  return new Date().toLocaleTimeString('ru', {
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Almaty',
  });
}

export default function Digest() {
  const [digest, setDigest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const loadDigest = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getDailyDigest();
      setDigest(data);
    } catch (e) {
      if (e.message.includes('404') || e.message.includes('не сгенерирован')) {
        setDigest(null);
      } else {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDigest(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const data = await generateDailyDigest();
      setDigest(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <>
      <div className="page-header">
        <h1 className="page-header-title">
          Дайджест дня
          {digest?.date && (
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--c-text-3)', marginLeft: 10 }}>
              {formatDate(digest.date)}, {formatTime()} (Астана)
            </span>
          )}
        </h1>
        <button
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={generating}
          style={{ fontSize: 12, padding: '7px 16px' }}
        >
          {generating ? (
            <>
              <div className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />
              Генерация...
            </>
          ) : (
            <>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Сгенерировать заново
            </>
          )}
        </button>
      </div>

      <div className="page-content">
        {error && (
          <div style={{ padding: '12px 16px', background: '#FFF0EE', border: '1px solid #FFD0CC', borderRadius: 10, color: '#FF3B30', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div className="spinner" style={{ width: 28, height: 28 }} />
          </div>
        )}

        {!loading && !digest && !generating && (
          <div className="empty-state">
            <div className="empty-state-icon" />
            <h2>Дайджест ещё не сгенерирован</h2>
            <p>Нажмите «Сгенерировать заново» чтобы создать аналитическую сводку по всем категориям за сегодня.</p>
            <button className="btn btn-primary" onClick={handleGenerate} style={{ marginTop: 8 }}>
              Сгенерировать дайджест
            </button>
          </div>
        )}

        {generating && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 60 }}>
            <div className="spinner" style={{ width: 32, height: 32 }} />
            <p style={{ fontSize: 14, color: 'var(--c-text-3)' }}>
              Анализируем статьи и генерируем сводку по категориям…
            </p>
          </div>
        )}

        {!loading && !generating && digest && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {digest.categories.map((item, i) => (
              <AccordionItem
                key={item.category}
                category={item.category}
                content={item.content}
                defaultOpen={i === 0}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
