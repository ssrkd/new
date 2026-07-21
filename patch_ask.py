import re

with open('frontend/src/pages/Ask.jsx', 'r') as f:
    text = f.read()

# Fix imports
text = text.replace(
    "import { supabase } from '../supabaseClient';\nimport noxLogo from '../images/NOX.webp';",
    "import { supabase } from '../supabase';\nimport { askQuestion, getChats, createChat, getChatHistory, deleteChat } from '../api';\nconst noxLogo = 'https://cdn-icons-png.flaticon.com/512/8644/8644104.png';"
)

# Replace everything from getSystemPrompt to the end of sendMessage
start_str = "  const getSystemPrompt = (role) => {"
end_str = "  }, [inputText, isLoading, activeChatId, activeChat, messages, user]);"

start_idx = text.find(start_str)
end_idx = text.find(end_str) + len(end_str)

if start_idx != -1 and end_idx != -1:
    new_sendMessage = """
  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isLoading || isSendingRef.current) return;
    isSendingRef.current = true;

    const userMsg = {
      role: 'user', text,
      time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
    };

    let chatId = activeChatId;

    if (!chatId) {
      try {
        const session = await createChat(text.slice(0, 40));
        chatId = session.id;
        setActiveChatId(chatId);
        // Add to state optimistic
        setChats(prev => [{ id: chatId, title: session.title, name: session.title }, ...prev]);
      } catch (e) {
        console.error('Ошибка создания чата', e);
      }
    } else {
      if (activeChat?.name === 'Новый чат' || activeChat?.title === 'Новый чат') {
        const newName = text.slice(0, 40);
        setChats(prev => prev.map(c => c.id === chatId ? { ...c, name: newName, title: newName } : c));
      }
    }

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const data = await askQuestion(text, chatId);
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
        role: 'assistant', text: finalResponseText,
        time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
      if (speakTextRef.current) speakTextRef.current(finalResponseText);

    } catch (err) {
      const errText = '⚠️ Ошибка: ' + (err.message || 'Сбой сети');
      const errMsg = { role: 'assistant', text: errText, time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }) };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
      isSendingRef.current = false;
    }
  }, [inputText, isLoading, activeChatId, activeChat, messages, user]);
"""
    text = text[:start_idx] + new_sendMessage.strip() + text[end_idx:]

with open('frontend/src/pages/Ask.jsx', 'w') as f:
    f.write(text)

