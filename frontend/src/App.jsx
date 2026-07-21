import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Feed from './pages/Feed';
import Digest from './pages/Digest';
import Ask from './pages/Ask';
import Sources from './pages/Sources';
import { triggerIngestion, triggerProcessing } from './api';

const PAGE_TITLES = {
  '/': 'Новостная лента',
  '/digest': 'Дайджест дня',
  '/ask': 'AI Chat',
  '/sources': 'Источники',
};

function AppShell() {
  const [ingesting, setIngesting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [notification, setNotification] = useState('');
  const location = useLocation();

  const notify = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  const handleIngest = async () => {
    if (ingesting) return;
    setIngesting(true);
    try {
      const r = await triggerIngestion();
      notify(r.message || "Процесс запущен в фоне");
    } catch (e) {
      notify(`Ошибка: ${e.message}`);
    } finally {
      setIngesting(false);
    }
  };

  const handleProcess = async () => {
    if (processing) return;
    setProcessing(true);
    try {
      const r = await triggerProcessing();
      notify(r.message || "Процесс запущен в фоне");
    } catch (e) {
      notify(`Ошибка: ${e.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        onTriggerIngest={handleIngest}
        onTriggerProcess={handleProcess}
        ingesting={ingesting}
        processing={processing}
      />

      {/* Notification toast */}
      {notification && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#111', color: '#FFF', padding: '10px 20px', borderRadius: 100,
          fontSize: 13, fontWeight: 500, zIndex: 9999,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          animation: 'fadeIn 0.2s ease',
        }}>
          {notification}
        </div>
      )}

      <main className="main-panel">
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/digest" element={<Digest />} />
          <Route path="/ask" element={<Ask />} />
          <Route path="/sources" element={<Sources />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
