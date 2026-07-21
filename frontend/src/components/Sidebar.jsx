import React, { useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { getMemory, updateMemory } from '../api';

const NAV = [
  {
    to: '/',
    label: 'Лента',
    icon: (
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
      </svg>
    ),
  },
  {
    to: '/digest',
    label: 'Дайджест',
    icon: (
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    to: '/ask',
    label: 'JackAI',
    icon: (
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    to: '/sources',
    label: 'Источники',
    icon: (
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
];

function AccountPanel({ onClose }) {
  const KEYS = [
    { key: 'name', label: 'Ваше имя', placeholder: 'Введите ваше имя...' },
    { key: 'role', label: 'Должность / роль', placeholder: 'Аналитик, менеджер...' },
    { key: 'interests', label: 'Темы интереса', placeholder: 'Экономика, дипломатия, санкции...' },
    { key: 'country', label: 'Страна / регион', placeholder: 'Казахстан...' },
    { key: 'notes', label: 'Дополнительные заметки', placeholder: 'Любая информация для AI...' },
  ];

  const [view, setView] = useState('main');
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getMemory()
      .then(data => setProfile(data.profile || {}))
      .catch(() => setProfile({}))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMemory(profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Failed to save memory', e);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setProfile({});
    await updateMemory({});
  };

  const isBlank = !profile.name;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
      <div
        style={{
          position: 'relative', width: 460, maxWidth: '92%', maxHeight: '90vh', background: '#ffffff',
          borderRadius: 16, padding: 28, display: 'flex', flexDirection: 'column', gap: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflowY: 'auto', animation: 'fadeIn 0.2s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        {view === 'main' && (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src="/images/serik.webp" alt="Serik" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '1px solid #eaeaea' }} />
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#111', letterSpacing: '-0.01em' }}>Serik Sisembaev</div>
                  <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
                    Основатель проекта
                  </div>
                </div>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: 22, padding: '0 4px', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
              <button
                onClick={() => setView('memory')}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#f8f9ff', border: '1px solid #e0e3ff', borderRadius: 12, cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#111"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4a4 4 0 014 4 4 4 0 01-4 4 4 4 0 01-4-4 4 4 0 014-4m0 10c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4z" /></svg>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>Память AI</div>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Управление данными для ИИ</div>
                  </div>
                </div>
                <div style={{ color: '#aaa' }}>→</div>
              </button>

              <button
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#fafafa', border: '1px solid #eaeaea', borderRadius: 12, cursor: 'default', textAlign: 'left' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#111"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>Интеграция</div>
                    <div style={{ fontSize: 12, color: '#34C759', marginTop: 2, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Подключен
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </>
        )}

        {view === 'memory' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
              <button onClick={() => setView('main')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#111', display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 600, padding: 0 }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Назад
              </button>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#111', letterSpacing: '-0.01em' }}>Память AI</div>
            </div>

            {isBlank && !loading && (
              <div style={{ background: '#f8f9ff', border: '1px solid #e0e3ff', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#555' }}>
                <strong>Представьтесь AI</strong> — введите ваше имя ниже, чтобы AI мог к вам обращаться.
              </div>
            )}

            {loading ? (
              <div style={{ textAlign: 'center', color: '#999', padding: '20px 0', fontSize: 13 }}>Загрузка...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {KEYS.map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>{label}</label>
                    <input
                      type="text" value={profile[key] || ''}
                      onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      style={{
                        width: '100%', boxSizing: 'border-box', background: '#fafafa', border: '1.5px solid #e8e8e8',
                        borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#111', fontFamily: 'var(--font)',
                        outline: 'none', transition: 'border-color 0.15s',
                      }}
                      onFocus={e => e.target.style.borderColor = '#111'}
                      onBlur={e => e.target.style.borderColor = '#e8e8e8'}
                    />
                  </div>
                ))}
              </div>
            )}

            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button onClick={handleClear} style={{ fontSize: 12, padding: '6px 12px', background: 'none', border: '1px solid #e8e8e8', borderRadius: 6, color: '#999', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                Очистить
              </button>
              <button onClick={handleSave} disabled={saving} style={{ fontSize: 13, padding: '8px 20px', background: '#111', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 600 }}>
                {saved ? 'Сохранено!' : saving ? 'Сохраняю...' : 'Сохранить'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Sidebar({ onTriggerIngest, onTriggerProcess, ingesting, processing }) {
  const [memOpen, setMemOpen] = useState(false);

  return (
    <>
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <img src="/images/jack.webp" alt="logo" style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0 }} />
          <span className="sidebar-logo-text" style={{ letterSpacing: '-0.02em' }}>AI news</span>
        </div>

        {/* Navigation — scrollable */}
        <div className="sidebar-section-label">Навигация</div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px', paddingBottom: '20px' }}>
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              {icon}
              {label}
            </NavLink>
          ))}

          {/* Admin controls inside scroll to prevent getting lost */}
          <div className="sidebar-section-label" style={{ marginTop: 24 }}>Управление</div>

          <button
            className="nav-item"
            onClick={onTriggerIngest}
            disabled={ingesting}
            title="Запустить сбор новостей немедленно"
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {ingesting ? 'Сбор...' : 'Собрать сейчас'}
          </button>

          <button
            className="nav-item"
            onClick={onTriggerProcess}
            disabled={processing}
            title="Запустить обработку через LLM"
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            {processing ? 'Обработка...' : 'Обработать'}
          </button>

          {/* Account */}
          <button
            className="nav-item"
            onClick={() => setMemOpen(true)}
            title="Ваш аккаунт и настройки"
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Аккаунт
          </button>
        </div>
      </aside>

      {memOpen && <AccountPanel onClose={() => setMemOpen(false)} />}
    </>
  );
}
