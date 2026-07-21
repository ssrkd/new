import React, { useState, useEffect } from 'react';
import { getSources, createSource, updateSource, deleteSource } from '../api';

const TYPES = ['rss', 'telegram', 'api'];
const EMPTY_FORM = { name: '', url: '', type: 'rss', active: true };

function Toggle({ checked, onChange }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  );
}

export default function Sources() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getSources();
      setSources(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleToggleActive = async (src) => {
    setSources(prev => prev.map(s => s.id === src.id ? { ...s, active: !s.active } : s));
    try {
      await updateSource(src.id, { active: !src.active });
    } catch (e) {
      // revert
      setSources(prev => prev.map(s => s.id === src.id ? { ...s, active: src.active } : s));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить источник? Статьи из него останутся в базе.')) return;
    setSources(prev => prev.filter(s => s.id !== id));
    try {
      await deleteSource(id);
    } catch (e) {
      setError(e.message);
      load();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.url) return;
    setSaving(true);
    try {
      const created = await createSource(form);
      setSources(prev => [...prev, created]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-header-title">Источники новостей</h1>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{ fontSize: 12, padding: '7px 16px', background: '#fff', border: 'none', color: '#111', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Добавить
        </button>
      </div>

      <div className="page-content">
        {error && (
          <div style={{ padding: '12px 16px', background: '#FFF0EE', border: '1px solid #FFD0CC', borderRadius: 10, color: '#FF3B30', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Add form */}
        {showForm && (
          <div className="card fade-in" style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--c-text)' }}>
              Новый источник
            </p>
            <form onSubmit={handleSubmit}>
              <div className="form-row" style={{ marginBottom: 12 }}>
                <div className="form-group">
                  <label className="form-label">Название</label>
                  <input
                    className="input-field"
                    placeholder="Reuters World"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-label">URL</label>
                  <input
                    className="input-field"
                    placeholder="https://feeds.reuters.com/..."
                    value={form.url}
                    onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="form-row" style={{ marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label">Тип</label>
                  <select
                    className="select-field"
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  >
                    {TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2, gap: 8 }}>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{ fontSize: 13, padding: '8px 20px', background: '#111', border: 'none', color: '#fff', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
                  >
                    {saving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    style={{ fontSize: 13, padding: '8px 16px', background: '#f0f0f0', border: 'none', color: '#555', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div className="spinner" style={{ width: 28, height: 28 }} />
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Название</th>
                  <th>URL</th>
                  <th>Тип</th>
                  <th>Активен</th>
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {sources.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--c-text-3)', padding: 32 }}>
                      Нет источников
                    </td>
                  </tr>
                ) : sources.map(src => (
                  <tr key={src.id}>
                    <td style={{ fontWeight: 500 }}>{src.name}</td>
                    <td>
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--c-text-3)', fontSize: 12, textDecoration: 'none', maxWidth: 260, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {src.url}
                      </a>
                    </td>
                    <td>
                      <span style={{ padding: '2px 8px', borderRadius: 5, background: 'var(--c-subtle)', fontSize: 11, fontWeight: 600, color: 'var(--c-text-3)', textTransform: 'uppercase' }}>
                        {src.type}
                      </span>
                    </td>
                    <td>
                      <Toggle
                        checked={src.active}
                        onChange={() => handleToggleActive(src)}
                      />
                    </td>
                    <td>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '5px 8px', fontSize: 12 }}
                        onClick={() => handleDelete(src.id)}
                        title="Удалить источник"
                      >
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
