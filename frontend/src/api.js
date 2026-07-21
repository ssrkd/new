/**
 * API helpers — all calls to FastAPI backend
 * Base URL via Vite proxy: /api → http://localhost:8000/api
 */

const BASE = import.meta.env.VITE_API_BASE_URL || '';

async function request(path, options = {}) {
  const token = localStorage.getItem('access_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ── Articles ──────────────────────────────────────────────────────────────────
export const getArticles = (params = {}) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== '') q.set(k, v); });
  return request(`/api/articles?${q.toString()}`);
};

// ── Ask / RAG ─────────────────────────────────────────────────────────────────
export const askQuestion = (question, chatId = null) =>
  request('/api/ask', { method: 'POST', body: JSON.stringify({ question, chat_id: chatId }) });

// ── Digest ────────────────────────────────────────────────────────────────────
export const getDailyDigest = () => request('/api/digest/daily');
export const generateDailyDigest = () => request('/api/digest/daily', { method: 'POST' });

// ── Sources ───────────────────────────────────────────────────────────────────
export const getSources = () => request('/api/sources');
export const createSource = (data) =>
  request('/api/sources', { method: 'POST', body: JSON.stringify(data) });
export const updateSource = (id, data) =>
  request(`/api/sources/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteSource = (id) =>
  request(`/api/sources/${id}`, { method: 'DELETE' });

// ── Admin ─────────────────────────────────────────────────────────────────────
export const triggerIngestion = () => request('/api/admin/ingest', { method: 'POST' });
export const triggerProcessing = () => request('/api/admin/process', { method: 'POST' });

// ── Chats ────────────────────────────────────────────────────────
export const getChats = () => request('/api/chats');
export const createChat = (title) =>
  request('/api/chats', { method: 'POST', body: JSON.stringify({ title: title || 'Новый чат' }) });
export const getChatHistory = (chatId) => request(`/api/chats/${chatId}`);
export const deleteChat = (chatId) => request(`/api/chats/${chatId}`, { method: 'DELETE' });

// ── Memory ───────────────────────────────────────────────────────
export const getMemory = () => request('/api/memory');
export const updateMemory = (profile) =>
  request('/api/memory', { method: 'PUT', body: JSON.stringify({ profile }) });
