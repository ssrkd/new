import re

with open('dashboard.jsx', 'r') as f:
    text = f.read()

# Fix imports
text = text.replace("import { supabase } from '../supabaseClient';", "import { supabase } from '../supabase';\nimport { askQuestion, getChats, createChat, getChatHistory, deleteChat } from '../api';")
text = text.replace("import noxLogo from '../images/NOX.webp';", "const noxLogo = 'https://cdn-icons-png.flaticon.com/512/8644/8644104.png';")

# Extract top part (before loadChats)
m_top = re.search(r"^(.*?)(  const loadChats = async \(\) => \{)", text, flags=re.DOTALL | re.MULTILINE)
top_part = m_top.group(1) if m_top else text[:text.find("  const loadChats")]

# Extract bottom part (from handleKeyDown)
m_bot = re.search(r"(  const handleKeyDown = useCallback\(\(e\) => \{.*)$", text, flags=re.DOTALL | re.MULTILINE)
bot_part = m_bot.group(1) if m_bot else text[text.find("  const handleKeyDown"):]

new_logic = """  const loadChats = useCallback(async () => {
    try {
      const data = await getChats();
      setChats(data || []);
      if (data && data.length > 0 && !activeChatId) {
        setActiveChatId(data[0].id);
      }
    } catch (e) {
      console.error('Failed to load chats', e);
    }
  }, [activeChatId]);

  useEffect(() => { loadChats(); }, [loadChats]);

  useEffect(() => {
    const loadMessages = async () => {
      if (!activeChatId) {
        setMessages([]);
        return;
      }
      try {
        const data = await getChatHistory(activeChatId);
        const msgs = (data.messages || []).map(m => ({
          role: m.role,
          text: m.content, // mapped to text for dashboard.jsx JSX compatibility
          sources: m.sources || [],
          time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
        }));
        setMessages(msgs);
      } catch (e) {
        console.error('Failed to load history', e);
      }
    };
    loadMessages();
  }, [activeChatId]);

  const createNewChat = async () => {
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
    const textStr = (forcedText || inputText).trim();
    if (!textStr || isLoading || isSendingRef.current) return;
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

    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }

    try {
      const data = await askQuestion(textStr, chatId);
      let rawText = data.answer || 'Готово.';
      const finalResponseText = rawText
        .replace(/\\*\\*(.+?)\\*\\*/g, '$1')
        .replace(/\\*(.+?)\\*/g, '$1')
        .replace(/#{1,6}\\s/g, '')
        .replace(/^[-*+]\\s/gm, '')
        .replace(/^\\d+\\.\\s/gm, '')
        .replace(/`{1,3}[^`]*`{1,3}/g, '')
        .replace(/\\[([^\\]]+)\\]\\([^)]+\\)/g, '$1')
        .replace(/_{1,2}(.+?)_{1,2}/g, '$1')
        .replace(/\\n{3,}/g, '\\n\\n')
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
      setIsLoading(false);
      isSendingRef.current = false;
    }
  }, [inputText, isLoading, activeChatId, loadChats]);

"""

text = top_part + new_logic + bot_part

# Change deleteChat to deleteChatById
text = text.replace("onClick={e => deleteChat(e, chat.id)}", "onClick={e => deleteChatById(e, chat.id)}")

# UI Fixes
text = text.replace("border: '1px solid #E8E8E8',", "border: '2px solid #E8E8E8',")
text = text.replace("backgroundColor: canSend ? '#111' : '#E4E4E4',", "backgroundColor: canSend ? '#0066FF' : '#E4E4E4', padding: '8px 20px', fontSize: '14px',")
text = text.replace("      sendMessage();\n    }", "      if (inputText.trim() && !isLoading) { sendMessage(); }\n    }")

# Apply AI news text overrides
text = text.replace("nóxAI", "AI news")
text = text.replace("НОКС", "AI news")
text = text.replace("Nox Ai", "AI news")
text = text.replace("NoxAiDashboard", "NoxAiDashboard")

# Fix Empty state text & add templates
empty_state_old = """Привет! Чем я могу<br />вам помочь?
            </h1>
            <p style={{ fontSize: '14px', color: '#8E8E93', margin: '0', textAlign: 'center' }}>
              Задавайте любые вопросы.
            </p>"""

empty_state_new = """Аналитик новостей
            </h1>
            <p style={{ fontSize: '14px', color: '#8E8E93', margin: '0 0 24px', textAlign: 'center' }}>
              Задайте вопрос по базе статей или выберите подсказку
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '400px' }}>
              {['Какие ключевые события произошли сегодня?', 'Что нового в отношениях Казахстана и соседних стран?', 'Какие важные новости в экономике?'].map(s => (
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
            </div>"""

text = text.replace(empty_state_old, empty_state_new)

with open('frontend/src/pages/Ask.jsx', 'w') as f:
    f.write(text)

