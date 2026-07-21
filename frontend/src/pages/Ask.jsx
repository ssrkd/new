import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { askQuestion, getChats, createChat, getChatHistory, deleteChat, getArticles } from '../api';
const noxLogo = '/images/nox_logo.webp';

// ─── Sub-components OUTSIDE main to prevent remount on every keystroke ──────

function OwnerAvatar({ user }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span style={{ fontSize: '13px', fontWeight: '600', color: '#1A1A1A' }}>Владелец&nbsp;</span>
      {user?.avatar_url ? (
        <img
          src={user.avatar_url}
          alt="avatar"
          style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <div style={{
          width: '28px', height: '28px', borderRadius: '50%',
          background: 'linear-gradient(135deg,#1A1A1A,#555)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', color: '#FFF', fontWeight: '700', flexShrink: 0,
        }}>
          {(user?.name || user?.username || 'O')[0].toUpperCase()}
        </div>
      )}
    </div>
  );
}

function InputBar({ inputText, onChange, onKeyDown, onSend, isLoading, textareaRef, ttsEnabled, onToggleTts, onStop, isListening, isTranscribing, onToggleListen }) {
  const canSend = inputText.trim() && !isLoading;
  return (
    <div style={{
      width: '100%',
      backgroundColor: '#FFFFFF',
      border: '2px solid #E8E8E8',
      borderRadius: '16px',
      padding: '12px 14px 10px 14px',
      boxSizing: 'border-box',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      <textarea
        ref={textareaRef}
        value={inputText}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder="Задавайте любые вопросы"
        rows={1}
        style={{
          width: '100%', border: 'none', background: 'transparent',
          resize: 'none', outline: 'none', fontSize: '14px',
          color: '#1A1A1A', fontFamily: 'inherit', lineHeight: '1.5',
          userSelect: 'text', padding: 0, margin: 0, display: 'block',
          minHeight: '21px', maxHeight: '150px', overflowY: 'auto'
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onToggleTts}
            title={ttsEnabled ? 'Озвучка включена' : 'Озвучка выключена'}
            style={{
              background: ttsEnabled ? '#E8E8E8' : 'transparent',
              border: 'none', color: ttsEnabled ? '#1A1A1A' : '#AEAEB2',
              cursor: 'pointer', padding: '5px 6px', display: 'flex',
              alignItems: 'center', borderRadius: '8px', transition: 'all 0.15s',
              gap: '4px', fontSize: '12px', fontFamily: 'inherit', fontWeight: '500',
            }}
          >
            {ttsEnabled ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536a5 5 0 000 7.072M6.343 6.343A8 8 0 1017.657 17.657" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5L6 9H2v6h4l5 4V5z" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" strokeWidth={2} strokeLinecap="round" />
                <line x1="17" y1="9" x2="23" y2="15" strokeWidth={2} strokeLinecap="round" />
              </svg>
            )}
            {ttsEnabled ? 'Голос вкл' : 'Голос выкл'}
          </button>
          <button
            onClick={onToggleListen}
            disabled={isTranscribing}
            title={isTranscribing ? 'Распознаю речь...' : isListening ? 'Остановить запись' : 'Голосовой ввод (Whisper)'}
            style={{
              background: isListening ? '#FFE5E5' : isTranscribing ? '#FFF3E0' : 'transparent',
              border: 'none', color: isListening ? '#FF3B30' : isTranscribing ? '#FF9500' : '#AEAEB2',
              cursor: isTranscribing ? 'wait' : 'pointer', padding: '5px 6px', display: 'flex',
              alignItems: 'center', borderRadius: '8px', transition: 'all 0.15s',
              gap: '4px', fontSize: '12px', fontFamily: 'inherit', fontWeight: '500',
            }}
          >
            {isTranscribing ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ animation: 'spin 1s linear infinite' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4l3 9a9 9 0 0 0 16.2 0M20 20l-3-9" />
              </svg>
            ) : isListening ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
              </svg>
            )}
            {isTranscribing ? 'Распознаю...' : isListening ? 'Стоп' : 'Микрофон'}
          </button>
        </div>
        <button
          id="send-msg-btn"
          onClick={onSend}
          disabled={!canSend}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '9px 20px', borderRadius: '100px',
            backgroundColor: canSend ? '#1A1A1A' : '#E4E4E4',
            color: canSend ? '#FFF' : '#AEAEB2',
            border: canSend ? '2px solid #1A1A1A' : '2px solid #D0D0D0',
            cursor: canSend ? 'pointer' : 'not-allowed',
            fontSize: '14px', fontWeight: '600', transition: 'all 0.15s', fontFamily: 'inherit',
            boxShadow: canSend ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
          }}
        >
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19V5m-7 7l7-7 7 7" />
          </svg>
          Отправить
        </button>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function NoxAiDashboard({ user }) {
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0); // 0=thinking,1=searching,2=forming
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [hoveredChatId, setHoveredChatId] = useState(null);
  const [templates, setTemplates] = useState([
    'Какие ключевые события произошли сегодня?',
    'Что нового в Казахстане и регионе?',
    'Какие важные новости в экономике?',
  ]);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  // TTS — объявляем раньше sendMessage чтобы sendMessage мог их видеть
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const audioRef = useRef(null);
  const speakTextRef = useRef(null);

  // Voice Input — MediaRecorder → Groq Whisper (точное распознавание)
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const toggleListening = async () => {
    if (isListening) {
      // Stop recording → will trigger onstop → transcribe
      mediaRecorderRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      // Try opus/webm first, fallback to whatever is supported
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop all tracks to release mic
        stream.getTracks().forEach(t => t.stop());

        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size < 1000) return; // too short, ignore

        setIsTranscribing(true);
        try {
          const formData = new FormData();
          const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
          formData.append('file', blob, `audio.${ext}`);

          const res = await fetch('/api/voice/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            const text = data.text?.trim();
            if (text) setInputText(text);
          } else {
            console.error('Transcription failed:', await res.text());
          }
        } catch (err) {
          console.error('Transcription error:', err);
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      setIsListening(true);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        alert('Разрешите доступ к микрофону в браузере');
      } else {
        console.error('Microphone error:', err);
        alert('Не удалось получить доступ к микрофону');
      }
    }
  };

  const activeChat = chats.find(c => c.id === activeChatId);

  // stopSpeakingRef lets us call stop before stopSpeaking is declared
  const stopSpeakingRef = useRef(null);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const loadChats = useCallback(async () => {
    try {
      const data = await getChats();
      setChats(data || []);
      // User wants it to open a new chat by default, so no auto-selecting latest
      // setActiveChatId(prev => ...) is removed.
    } catch (e) {
      console.error('Failed to load chats', e);
    }
  }, []); // no deps — avoids infinite loop

  useEffect(() => { loadChats(); }, [loadChats]);

  useEffect(() => {
    const loadMessages = async () => {
      // Stop TTS when switching chats (use ref to avoid hoisting issue)
      if (stopSpeakingRef.current) stopSpeakingRef.current();
      if (!activeChatId) {
        setMessages([]);
        return;
      }
      try {
        const data = await getChatHistory(activeChatId);
        const msgs = (data.messages || []).map(m => ({
          role: m.role,
          text: m.content,
          sources: m.sources || [],
          time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
        }));
        // Защита от затирания локальных сообщений при создании нового чата
        setMessages(prev => {
          if (msgs.length === 0 && prev.length > 0) return prev;
          return msgs;
        });
      } catch (e) {
        console.error('Failed to load history', e);
      }
    };
    loadMessages();
  }, [activeChatId]);

  const createNewChat = async () => {
    if (stopSpeakingRef.current) stopSpeakingRef.current();
    try {
      const session = await createChat('Новый чат');
      await loadChats();
      setActiveChatId(session.id);
      setMessages([]);
      setInputText('');
    } catch (e) {
      console.error('Failed to create chat', e);
    }
  };

  const deleteChatById = async (e, chatId) => {
    e.stopPropagation();
    try {
      await deleteChat(chatId);
      if (activeChatId === chatId) {
        setActiveChatId(null);
        setMessages([]);
      }
      await loadChats();
    } catch (e) {
      console.error('Failed to delete chat', e);
    }
  };

  const startRename = (e, chat) => {
    e.stopPropagation();
    setRenamingId(chat.id);
    setRenameValue(chat.name || chat.title);
  };

  const commitRename = async (chatId) => {
    if (renameValue.trim()) {
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, title: renameValue.trim(), name: renameValue.trim() } : c));
    }
    setRenamingId(null);
  };

  const isSendingRef = useRef(false);

  const sendMessage = useCallback(async (forcedText = null) => {
    const isForced = typeof forcedText === 'string' && forcedText.trim().length > 0;
    const textStr = isForced ? forcedText.trim() : inputText.trim();
    if (!textStr || isSendingRef.current) return;
    if (isLoading && !isForced) return;
    isSendingRef.current = true;

    let chatId = activeChatId;
    if (!chatId) {
      try {
        const session = await createChat(textStr.slice(0, 50));
        chatId = session.id;
        setActiveChatId(chatId);
        await loadChats();
      } catch (e) {
        console.error('Ошибка создания чата', e);
        isSendingRef.current = false;
        return;
      }
    }

    const userMsg = { role: 'user', text: textStr, time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);
    setLoadingStage(0);

    // Cycle through thinking stages
    const stageTimer1 = setTimeout(() => setLoadingStage(1), 1200);
    const stageTimer2 = setTimeout(() => setLoadingStage(2), 2800);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const data = await askQuestion(textStr, chatId);
      let rawText = data.answer || 'Готово.';
      const finalResponseText = rawText
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/#{1,6}\s/g, '')
        .replace(/^[-*+]\s/gm, '')
        .replace(/^\d+\.\s/gm, '')
        .replace(/`{1,3}[^`]*`{1,3}/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/_{1,2}(.+?)_{1,2}/g, '$1')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      const aiMsg = {
        role: 'assistant',
        text: finalResponseText,
        sources: data.sources || [],
        time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
      if (speakTextRef.current) speakTextRef.current(finalResponseText);
      loadChats();
    } catch (e) {
      const errMsg = { role: 'assistant', text: 'Ошибка связи с сервером.', time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }) };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      setIsLoading(false);
      setLoadingStage(0);
      isSendingRef.current = false;
    }
  }, [inputText, isLoading, activeChatId, loadChats]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputText.trim() && !isLoading) { sendMessage(); }
    }
  }, [sendMessage]);

  const handleChange = useCallback((e) => {
    setInputText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, []);

  // ── TTS — Edge TTS (DmitryNeural): локально через прокси, на Vercel через /api/edge-tts ──

  // Определяем URL для TTS: локально localhost:3041, на Vercel — /api/edge-tts
  const getTtsBaseUrl = () => {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:3041';
    return '/api/edge-tts';
  };

  // Проверяем доступность локального TTS сервера
  const [localTtsAvailable, setLocalTtsAvailable] = useState(null);

  useEffect(() => {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalhost) {
      // На продакшене используем /api/edge-tts — всегда доступно
      setLocalTtsAvailable(false);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    fetch('http://localhost:3041/tts?text=test', { signal: controller.signal })
      .then(r => { clearTimeout(timeout); setLocalTtsAvailable(r.ok); })
      .catch(() => { clearTimeout(timeout); setLocalTtsAvailable(false); });
  }, []);

  const cleanTextForTts = (text) => {
    return text
      .replace(/[*_#`~]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/qaraa/gi, 'кара')
      .replace(/noxAI/gi, 'нокс')
      .replace(/nox/gi, 'нокс')
      .replace(/IT/g, 'Ай-Ти')
      .replace(/Серик/g, 'Сэрик')
      .trim();
  };

  // Синтез через Edge TTS (локальный прокси или серверный /api/edge-tts)
  const fetchEdgeTtsAudio = useCallback(async (sentence) => {
    const isLocal = localTtsAvailable;
    const params = new URLSearchParams({
      text: sentence,
      voice: 'ru-RU-DmitryNeural',
      rate: '+18%',
      pitch: '-4Hz'
    });

    if (isLocal) {
      // Локальный edge-tts Python прокси
      const response = await fetch(`http://localhost:3041/tts?${params.toString()}`);
      if (!response.ok) throw new Error('Local TTS failed');
      return await response.blob();
    } else {
      // Vercel serverless proxy (тот же DmitryNeural)
      const response = await fetch(`/api/edge-tts?${params.toString()}`);
      if (!response.ok) throw new Error('Server TTS failed');
      return await response.blob();
    }
  }, [localTtsAvailable]);

  // Fallback: браузерный TTS
  const speakWithBrowserTts = useCallback((text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Auto-detect Kazakh characters
    const isKazakh = /[әіңғүұқөһӘІҢҒҮҰҚӨҺ]/i.test(text);
    utterance.lang = isKazakh ? 'kk-KZ' : 'ru-RU';
    
    utterance.rate = 1.15;
    utterance.pitch = 0.9;
    
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = null;
    
    if (isKazakh) {
      selectedVoice = voices.find(v => v.lang.startsWith('kk'));
    }
    
    if (!selectedVoice) {
      // Prefer male voices like Pavel or Yuri if available
      selectedVoice = voices.find(v => v.lang.startsWith('ru') && (v.name.includes('Yuri') || v.name.includes('Pavel')))
                   || voices.find(v => v.lang.startsWith('ru'));
    }
    
    if (selectedVoice) utterance.voice = selectedVoice;
    
    audioRef.current = {
      pause: () => window.speechSynthesis.cancel()
    };
    window.speechSynthesis.speak(utterance);
  }, []);

  const speakText = useCallback(async (text) => {
    if (!ttsEnabled) return;
    try {
      if (audioRef.current && typeof audioRef.current.pause === 'function') {
        audioRef.current.pause();
      }

      const cleanText = cleanTextForTts(text);
      if (!cleanText) return;

      const sentences = cleanText.match(/[^.!?\n]+[.!?\n]+/g) || [cleanText];

      const audioQueue = [];
      let isPlaying = false;
      let stopRequested = false;
      let currentAudio = null;

      audioRef.current = {
        pause: () => {
          stopRequested = true;
          if (currentAudio) currentAudio.pause();
        }
      };

      const playNext = async () => {
        if (stopRequested || audioQueue.length === 0) {
          isPlaying = false;
          return;
        }
        isPlaying = true;
        const url = audioQueue.shift();
        currentAudio = new Audio(url);
        currentAudio.onended = () => {
          URL.revokeObjectURL(url);
          playNext();
        };
        currentAudio.onerror = () => playNext();
        try {
          await currentAudio.play();
        } catch {
          playNext();
        }
      };

      for (let i = 0; i < sentences.length; i++) {
        if (stopRequested) break;
        const sentence = sentences[i].trim();
        if (!sentence) continue;

        try {
          const blob = await fetchEdgeTtsAudio(sentence);
          const audioUrl = URL.createObjectURL(blob);
          audioQueue.push(audioUrl);
          if (!isPlaying) playNext();
        } catch (e) {
          console.warn('Edge TTS failed, browser fallback:', e);
          speakWithBrowserTts(sentence);
          await new Promise(resolve => setTimeout(resolve, sentence.length * 60));
        }
      }
    } catch (e) {
      console.warn('TTS error:', e);
    }
  }, [ttsEnabled, fetchEdgeTtsAudio, speakWithBrowserTts]);

  // Обновляем ref при каждом рендере
  speakTextRef.current = speakText;

  const stopSpeaking = useCallback(() => {
    if (audioRef.current && typeof audioRef.current.pause === 'function') {
      audioRef.current.pause();
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Register stopSpeaking in ref so it can be called before declaration
  stopSpeakingRef.current = stopSpeaking;


  return (
    <div style={{
      display: 'flex', height: '100vh', width: '100vw',
      backgroundColor: '#F3F3F3',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      color: '#1A1A1A', margin: 0, padding: 0, boxSizing: 'border-box',
      overflow: 'hidden', letterSpacing: '-0.01em',
    }}>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: '240px', height: '100%', display: 'flex', flexDirection: 'column', padding: '20px 14px', boxSizing: 'border-box', flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 6px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src={noxLogo} alt="noxAI logo" style={{ width: '22px', height: '22px', borderRadius: '6px', objectFit: 'contain', mixBlendMode: 'multiply' }} />
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A' }}>JackAI</span>
          </div>
        </div>

        {/* New chat */}
        <button onClick={createNewChat} style={{
          display: 'flex', alignItems: 'center', gap: '9px', width: '100%',
          padding: '8px 10px', backgroundColor: '#FFFFFF', border: 'none',
          borderRadius: '8px', fontSize: '13px', color: '#1A1A1A', textAlign: 'left',
          cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '4px',
          fontFamily: 'inherit', userSelect: 'none',
        }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Новый чат
        </button>

        {/* Chats */}
        {chats.length > 0 && (
          <>
            <div style={{ fontSize: '11px', color: '#8E8E93', padding: '0 10px', marginTop: '16px', marginBottom: '6px', userSelect: 'none' }}>Чаты</div>
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {chats.map(chat => (
                <div
                  key={chat.id}
                  onMouseEnter={() => setHoveredChatId(chat.id)}
                  onMouseLeave={() => setHoveredChatId(null)}
                  onClick={() => setActiveChatId(chat.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '5px 6px 5px 10px', borderRadius: '8px',
                    background: activeChatId === chat.id ? '#FFFFFF' : hoveredChatId === chat.id ? '#F0F0F0' : 'transparent',
                    cursor: 'pointer', transition: 'background 0.12s',
                  }}
                >
                  {renamingId === chat.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onBlur={() => commitRename(chat.id)}
                      onKeyDown={e => { if (e.key === 'Enter') commitRename(chat.id); e.stopPropagation(); }}
                      onClick={e => e.stopPropagation()}
                      style={{ flex: 1, border: 'none', outline: '1px solid #D0D0D0', borderRadius: '4px', fontSize: '13px', padding: '2px 4px', fontFamily: 'inherit', background: '#FFF' }}
                    />
                  ) : (
                    <span style={{
                      flex: 1, fontSize: '13px', userSelect: 'none',
                      color: activeChatId === chat.id ? '#1A1A1A' : '#545456',
                      fontWeight: activeChatId === chat.id ? '500' : '400',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{chat.name || chat.title}</span>
                  )}
                  {(hoveredChatId === chat.id || activeChatId === chat.id) && renamingId !== chat.id && (
                    <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                      <button onClick={e => startRename(e, chat)} title="Переименовать"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '3px', color: '#8E8E93', display: 'flex', alignItems: 'center', borderRadius: '4px' }}>
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={e => deleteChatById(e, chat.id)} title="Удалить"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '3px', color: '#8E8E93', display: 'flex', alignItems: 'center', borderRadius: '4px' }}>
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </aside>

      {/* ── MAIN ── */}
      <main style={{
        flex: 1, height: 'calc(100vh - 16px)', margin: '8px 8px 8px 0',
        backgroundColor: '#FFFFFF', borderRadius: '20px',
        display: 'flex', flexDirection: 'column',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.015)',
      }}>
        {/* Blur decor */}
        <div style={{ position: 'absolute', top: '20%', left: '55%', transform: 'translate(-50%,-50%)', width: '320px', height: '320px', background: 'radial-gradient(circle,rgba(220,195,255,0.4)0%,rgba(255,220,235,0.3)50%,rgba(255,255,255,0)100%)', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '5%', width: '450px', height: '450px', background: 'radial-gradient(circle,rgba(255,225,235,0.35)0%,rgba(225,235,255,0.2)60%,rgba(255,255,255,0)100%)', filter: 'blur(70px)', pointerEvents: 'none', zIndex: 0 }} />

        {/* ── HEADER — always visible ── */}
        <header style={{
          position: 'relative', zIndex: 10, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 24px', borderBottom: '1px solid #F2F2F2',
        }}>
          <span style={{ fontSize: '15px', fontWeight: '500', color: '#1A1A1A' }}>
            {activeChat?.name || activeChat?.title || 'JackAI'}
          </span>
          <OwnerAvatar user={user} />
        </header>

        {/* ── CONTENT (MESSAGES OR EMPTY STATE) ── */}
        {messages.length === 0 ? (
          /* Empty state */
          <div style={{
            position: 'relative', zIndex: 10, flex: 1,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            width: '100%', padding: '0 48px', boxSizing: 'border-box',
          }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg,#FFDFE9 0%,#D3E0FF 50%,#B5FFFC 100%)',
              boxShadow: 'inset -2px -2px 8px rgba(255,255,255,0.6),inset 4px 4px 12px rgba(255,255,255,0.8),0 10px 30px rgba(181,255,252,0.4)',
              marginBottom: '22px',
            }} />
            <h1 style={{ fontSize: '34px', fontWeight: '600', textAlign: 'center', lineHeight: '1.15', margin: '0 0 8px', letterSpacing: '-0.02em', color: '#1A1A1A' }}>
              Аналитик новостей
            </h1>
            <p style={{ fontSize: '14px', color: '#8E8E93', margin: '0 0 24px', textAlign: 'center' }}>
              Задайте вопрос по базе статей или выберите подсказку
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '380px' }}>
              {templates.map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  style={{
                    padding: '12px 16px', background: '#F8F8F8', border: '1px solid #E8E8E8', borderRadius: '12px',
                    fontSize: '13px', color: '#1A1A1A', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#F0F0F0'}
                  onMouseOut={e => e.currentTarget.style.background = '#F8F8F8'}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Chat view */
          <div ref={messagesContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '100%', maxWidth: '540px', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', zIndex: 10 }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '8px', alignItems: 'flex-end', width: '100%' }}>
                    {msg.role === 'assistant' && (
                      <img src={noxLogo} alt="nox" style={{ width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0, marginBottom: '2px', mixBlendMode: 'multiply' }} />
                    )}
                    <div style={{
                      maxWidth: '62%', padding: '9px 13px',
                      borderRadius: msg.role === 'user' ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                      background: msg.role === 'user' ? '#1A1A1A' : '#F0F0F2',
                      color: msg.role === 'user' ? '#FFF' : '#1A1A1A',
                      fontSize: '13.5px', lineHeight: '1.5', whiteSpace: 'pre-wrap', userSelect: 'text',
                    }}>
                      {msg.text}
                      <div style={{ fontSize: '10px', color: msg.role === 'user' ? 'rgba(255,255,255,0.35)' : '#AEAEB2', marginTop: '4px', textAlign: 'right' }}>{msg.time}</div>
                    </div>
                  </div>
                  {/* Виджет сотрудников — появляется под ответом AI newsа когда он проверял сотрудников */}
                  {msg.role === 'assistant' && msg.employeeWidget && msg.employeeWidget.details && (
                    <div style={{ marginLeft: '38px', background: '#FFFFFF', border: '2px solid #E8E8E8', borderRadius: '14px', padding: '12px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', minWidth: '240px', maxWidth: '320px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                        Сотрудники • {msg.employeeWidget.total_employees} чел.
                      </div>
                      {msg.employeeWidget.details.map((emp, ei) => (
                        <div key={ei} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 0', borderBottom: ei < msg.employeeWidget.details.length - 1 ? '1px solid #F2F2F2' : 'none' }}>
                          <div style={{
                            width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                            background: emp.online ? '#34C759' : '#D1D1D6',
                            boxShadow: emp.online ? '0 0 0 2px rgba(52,199,89,0.25)' : 'none'
                          }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: '500', color: '#1A1A1A' }}>{emp.name}</div>
                            <div style={{ fontSize: '11px', color: '#8E8E93' }}>
                              {emp.role === 'seller' ? 'Продавец' : emp.role === 'cashier' ? 'Кассир' : emp.role}
                              {!emp.is_active && ' • Экс-сотрудник'}
                            </div>
                          </div>
                          <div style={{ fontSize: '11px', color: emp.online ? '#34C759' : '#AEAEB2', fontWeight: '500' }}>
                            {emp.online ? 'в сети' : 'офлайн'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                  <img src={noxLogo} alt="nox" style={{ width: '22px', height: '22px', borderRadius: '6px', mixBlendMode: 'multiply', flexShrink: 0 }} />
                  <div style={{ padding: '9px 14px', borderRadius: '14px 14px 14px 3px', background: '#F0F0F2', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#8E8E93', animation: 'noxBounce 1.2s infinite', animationDelay: `${i * 0.2}s` }} />
                      ))}
                    </div>
                    <span style={{ fontSize: '12px', color: '#8E8E93', fontStyle: 'italic' }}>
                      {loadingStage === 0 ? 'Думаю...' : loadingStage === 1 ? 'Ищу в базе...' : 'Формирую ответ...'}
                    </span>
                  </div>
                </div>
              )}
              <style>{`@keyframes noxBounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-7px)}}`}</style>
            </div>
          </div>
        )}

        {/* ── INPUT BAR & FOOTER — always at bottom ── */}
        <div style={{ position: 'relative', zIndex: 10, flexShrink: 0, padding: '0 0 4px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '540px', padding: '0 20px', boxSizing: 'border-box' }}>
            <InputBar
              inputText={inputText}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onSend={sendMessage}
              isLoading={isLoading}
              textareaRef={textareaRef}
              ttsEnabled={ttsEnabled}
              onToggleTts={() => { setTtsEnabled(prev => !prev); stopSpeaking(); }}
              isListening={isListening}
              isTranscribing={isTranscribing}
              onToggleListen={toggleListening}
              onStop={stopSpeaking}
            />
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
        <footer style={{ position: 'relative', zIndex: 10, flexShrink: 0, textAlign: 'center', fontSize: '11px', color: '#AEAEB2', paddingBottom: '12px' }}>
          Jack — Это ИИ. Он может ошибаться. Всегда проверяйте важную информацию.
        </footer>
      </main>
    </div>
  );
}