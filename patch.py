with open('frontend/src/pages/Ask.jsx', 'r') as f:
    text = f.read()

# Fix imports
text = text.replace("import { supabase } from '../supabaseClient';", "import { supabase } from '../supabase';\nimport { askQuestion, getChats, createChat, getChatHistory, deleteChat } from '../api';")
text = text.replace("import noxLogo from '../images/NOX.webp';", "const noxLogo = 'https://cdn-icons-png.flaticon.com/512/8644/8644104.png';")

# Find the start of loadChats
start_idx = text.find("  const loadChats = useCallback(async () => {")

# Find the start of handleKeyDown
end_idx = text.find("  const handleKeyDown = useCallback((e) => {")

if start_idx != -1 and end_idx != -1:
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
          text: m.content,
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

  const sendMessage = useCallback(async () => {
    const textStr = inputText.trim();
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
        return;
      }
    }

    const userMsg = { role: 'user', text: textStr, time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

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
    text = text[:start_idx] + new_logic + text[end_idx:]

text = text.replace("onClick={e => deleteChat(e, chat.id)}", "onClick={e => deleteChatById(e, chat.id)}")

with open('frontend/src/pages/Ask.jsx', 'w') as f:
    f.write(text)

