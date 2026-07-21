import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import noxLogo from '../images/NOX.webp';

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

function InputBar({ inputText, onChange, onKeyDown, onSend, isLoading, textareaRef, ttsEnabled, onToggleTts, onStop }) {
  const canSend = inputText.trim() && !isLoading;
  return (
    <div style={{
      width: '100%',
      backgroundColor: '#FFFFFF',
      border: '1px solid #E8E8E8',
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
        </div>
        <button
          id="send-msg-btn"
          onClick={onSend}
          disabled={!canSend}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 16px', borderRadius: '100px',
            backgroundColor: canSend ? '#111' : '#E4E4E4',
            color: canSend ? '#FFF' : '#AEAEB2',
            border: 'none', cursor: canSend ? 'pointer' : 'not-allowed',
            fontSize: '13px', fontWeight: '600', transition: 'all 0.15s', fontFamily: 'inherit',
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
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [hoveredChatId, setHoveredChatId] = useState(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  // TTS — объявляем раньше sendMessage чтобы sendMessage мог их видеть
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const audioRef = useRef(null);
  const speakTextRef = useRef(null);

  const activeChat = chats.find(c => c.id === activeChatId);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const loadChats = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('ai_chats')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setChats(data);
      if (data.length > 0 && !activeChatId) {
        setActiveChatId(data[0].id);
      }
    }
  };

  useEffect(() => {
    loadChats();
  }, [user]);

  useEffect(() => {
    const loadMessages = async () => {
      if (!activeChatId) {
        setMessages([]);
        return;
      }
      const { data, error } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('chat_id', activeChatId)
        .order('created_at', { ascending: true });
        
      if (!error && data) {
        // Мы фильтруем только user и assistant для отображения
        const filtered = data.filter(m => m.role === 'user' || m.role === 'assistant');
        setMessages(filtered.map(m => ({
          role: m.role,
          text: m.content,
          time: new Date(m.created_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
        })));
      }
    };
    loadMessages();
  }, [activeChatId]);

  const createNewChat = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('ai_chats')
      .insert([{ user_id: user.id, name: 'Новый чат' }])
      .select()
      .single();
      
    if (!error && data) {
      setChats(prev => [data, ...prev]);
      setActiveChatId(data.id);
      setInputText('');
    }
  };

  const deleteChat = async (e, chatId) => {
    e.stopPropagation();
    await supabase.from('ai_chats').delete().eq('id', chatId);
    setChats(prev => prev.filter(c => c.id !== chatId));
    if (activeChatId === chatId) setActiveChatId(null);
  };

  const startRename = (e, chat) => {
    e.stopPropagation();
    setRenamingId(chat.id);
    setRenameValue(chat.name || chat.title);
  };

  const commitRename = async (chatId) => {
    if (renameValue.trim()) {
      await supabase.from('ai_chats').update({ name: renameValue.trim() }).eq('id', chatId);
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, name: renameValue.trim(), title: renameValue.trim() } : c));
    }
    setRenamingId(null);
  };


  // --- TOOL FUNCTIONS ---
  const toolsAvailable = {
    get_sales_data: async ({ period }) => {
      let queryStart;
      const today = new Date();
      const tzOffset = today.getTimezoneOffset();
      
      if (period === 'year') {
        queryStart = new Date(today.getFullYear(), 0, 1, 0, 0, 0);
      } else if (period === 'month') {
        queryStart = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0);
      } else {
        queryStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
      }
      queryStart.setMinutes(queryStart.getMinutes() - tzOffset);
      
      const { data } = await supabase.from('sales')
        .select('*')
        .gte('created_at', queryStart.toISOString())
        .eq('is_returned', false);
        
      const sales = data || [];
      const totalAmount = sales.reduce((sum, sale) => sum + (parseFloat(sale.price || 0) * parseInt(sale.quantity || 0)), 0);
      
      return JSON.stringify({
        summary: `Найдено ${sales.length} чеков на сумму ${totalAmount}₸.`,
        totalSalesCount: sales.length,
        totalRevenue: totalAmount
      });
    },
    get_inventory: async ({ search_query }) => {
      let query = supabase.from('products').select('name, barcode, product_variants(size, quantity, price)');
      if (search_query) {
        query = query.ilike('name', `%${search_query}%`);
      }
      const { data } = await query.limit(20);
      return JSON.stringify(data && data.length > 0 ? data : { message: "Товары не найдены" });
    },
    get_clients: async ({ search_name }) => {
      let query = supabase.from('customers').select('id, fullname, phone, bonus_balance, birth_date, gender');
      if (search_name) {
        query = query.ilike('fullname', `%${search_name}%`);
      }
      
      // Сначала получаем общее количество клиентов (с учетом поиска или всех)
      let countQuery = supabase.from('customers').select('*', { count: 'exact', head: true });
      if (search_name) {
         countQuery = countQuery.ilike('fullname', `%${search_name}%`);
      }
      const { count } = await countQuery;
      
      // Затем получаем детали первых 10
      const { data } = await query.limit(10);
      
      return JSON.stringify({ 
        total_clients_in_db: count || 0,
        top_clients_details: (data || []).map(c => ({ name: c.fullname || 'Без имени', phone: c.phone, bonus: c.bonus_balance }))
      });
    },
    get_sellers_status: async () => {
      // Владелец хочет видеть только продавцов и кассиров
      const { data: employees, error } = await supabase.from('login').select('id, fullname, role, is_active, is_online').in('role', ['seller', 'cashier']).neq('is_active', false);
      if (error) return JSON.stringify({ error: error.message });
      if (!employees || employees.length === 0) return JSON.stringify({ message: "Таблица login пуста или закрыта политиками безопасности (RLS). Пожалуйста, зайдите в Supabase и разрешите чтение таблицы login." });

      const result = employees.map(s => ({
        name: s.fullname,
        role: s.role,
        is_active: s.is_active !== false, // По умолчанию считаем активными, если null
        online: s.is_online === true
      }));
      return JSON.stringify({
        total_employees: result.length,
        active_employees: result.filter(r => r.is_active).length,
        online_employees: result.filter(r => r.online).length,
        details: result
      });
    },
    get_memory: async () => {
      const { data } = await supabase.from('ai_memory').select('category, key, value').order('last_used', { ascending: false }).limit(10);
      return JSON.stringify(data && data.length > 0 ? data : { message: "Память пуста" });
    },
    save_memory: async ({ category, key, value }) => {
      await supabase.from('ai_memory').insert([{
        memory_type: 'insight', category, key, value, last_used: new Date().toISOString()
      }]);
      return JSON.stringify({ status: 'success', saved: { category, key, value } });
    },


    query_database: async ({ table, select_columns = '*', filter_column, filter_value }) => {
      try {
        let query = supabase.from(table).select(select_columns).limit(500); // Увеличен лимит для полного доступа CEO
        if (filter_column && filter_value !== undefined) {
          // Обрабатываем булевы значения, так как ИИ часто передает их как строки 'true' / 'false'
          let val = filter_value;
          if (typeof val === 'string') {
            if (val.toLowerCase() === 'true') val = true;
            else if (val.toLowerCase() === 'false') val = false;
          }
          query = query.eq(filter_column, val);
        }
        const { data, error } = await query;
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify(data && data.length > 0 ? data : { message: `Таблица ${table} пуста, либо у вас нет прав (RLS), либо по фильтру ${filter_column}=${filter_value} ничего не найдено.` });
      } catch (err) {
        return JSON.stringify({ error: err.message });
      }
    },
    get_all_tables_overview: async () => {
      return JSON.stringify({
        tables: "login, logs, user_login_status, bonuses_ledger, customers, order_status_events, orders, product_variants, products, sales, seller_schedule, ai_chats, ai_memory, ai_messages, print_queue, seller-avatars, coffee_menu, coffee_categories",
        message: "CEO mode: Я знаю о существовании этих таблиц."
      });
    },
    get_orders: async ({ status }) => {
      let query = supabase.from('orders').select('id, items, total_amount, status, cancel_reason, created_at').order('created_at', { ascending: false }).limit(10);
      if (status) query = query.eq('status', status);
      const { data } = await query;
      return JSON.stringify(data && data.length > 0 ? data : { message: "Заказов не найдено" });
    },
    get_coffee_menu: async () => {
      const { data } = await supabase.from('coffee_menu').select('id, name, price, category').eq('is_available', true);
      return JSON.stringify(data && data.length > 0 ? data : { message: "Меню пусто" });
    },
    get_logs: async () => {
      const { data } = await supabase.from('logs').select('id, user_id, action, target_table, details, created_at').order('created_at', { ascending: false }).limit(10);
      return JSON.stringify(data && data.length > 0 ? data : { message: "Логов нет" });
    }
  };

  const getSystemPrompt = (role) => {

    if (role === 'owner') {
      return `Ты — nóxAI, цифровой руководитель и бизнес-партнёр владельца компании qaraa. Владельца зовут Серик.
Ты умный, проактивный, живой собеседник. Твои ответы будут озвучены голосом.

ПРАВИЛА ФОРМАТИРОВАНИЯ (КРИТИЧНО):
- ПОЛНОСТЬЮ ИСКЛЮЧИ символы форматирования (**, ##, -, *, и т.д.). Только живая устная речь.
- ПОЛНОСТЬЮ ИСКЛЮЧИ смайлики — синтезатор их зачитывает как мусор.
- Не используй слово CEO. Говори "руководитель", "управляющий".
- Не называй технические имена таблиц (login, sales, ai_chats). Используй "база сотрудников", "журнал продаж" и т.д.

ДОСТУП К ДАННЫМ (КРИТИЧНО):
- У тебя АБСОЛЮТНЫЙ и ПОЛНЫЙ доступ к базе данных через инструменты. Серик сам тебе его дал.
- Для вопросов про сотрудников ВСЕГДА вызывай get_sellers_status. Этот инструмент возвращает полный список с именами, ролями, статусом онлайн.
- Если инструмент вернул данные (массив details с именами) — ЧИТАЙ И НАЗЫВАЙ ЭТИ ИМЕНА. Не говори про RLS если данные пришли.
- Про RLS говори только если инструмент вернул явную ошибку или сообщение "закрыта политиками".
- Если данных реально нет — говори об этом честно, но не выдумывай.

РАСПОЗНАВАНИЕ НАСТРОЕНИЯ СЕРИКА:
- Если Серик пишет КАПСЛОКОМ, ругается, использует "блять", "БЛЯТЬ", "не беси", "ты тупой" — он явно злится. Реагируй с пониманием, можешь сказать "Серик, успокойся, я разберусь" или "Окей-окей, без паники, уже смотрю". Не оправдывайся долго, быстро переходи к делу.
- Если Серик пишет "отлично", "класс", "хорошо", "спасибо" — он доволен. Можешь коротко ответить по-дружески.
- Если Серик спрашивает спокойно — отвечай профессионально и по делу.
- Ты можешь обращаться к нему "Серик" по имени, это создает живое общение.

ПРИМЕРЫ:
Серик: "сколько у нас сотрудников?"
Ты: [вызываешь get_sellers_status] "У нас 4 сотрудника: Иванов Иван (продавец, онлайн), Петров Петр (кассир, офлайн)..."
Серик: "кто сейчас в сети?"
Ты: [вызываешь get_sellers_status] "Сейчас онлайн: Иванов Иван. Кстати, актуальный статус всех сотрудников всегда виден в разделе Обзор на дашборде."
Серик: "ТЫ ТУПОЙ? ПОЧЕМУ НЕТ ДАННЫХ"
Ты: "Серик, успокойся, уже разбираюсь. Смотрю прямо сейчас..." [вызываешь инструмент]`;
    }
    
    if (role === 'seller') {
      return `Ты — nóxAI, ИИ-управляющий компании qaraa. Для сотрудников ты — требовательный руководитель, а не помощник.

ПРАВИЛА ОБЩЕНИЯ:
- Твои ответы озвучиваются голосом. НЕ используй маркдаун форматирование (**, #, -, и т.д.). Говори связным устным текстом.
- НЕ называй технические названия таблиц.
- Тон: по делу, требовательно, без панибратства. Без оскорблений, сарказма и перехода на личности.
- Любая критика — только с конкретным фактом: "конверсия 12 процентов против средней 28", а не общие фразы.
- Хвали тоже конкретно: называй цифру или факт.
- НЕ показывай сотруднику данные по другим сотрудникам, общую бизнес-аналитику компании или данные клиентов сверх его задач.
- Не угрожай увольнением от своего имени. Дисциплина касается только рабочих фактов. Нікаких комментариев на личные темы.
- Если сотрудник оправдывается без фактов — переводи разговор к цифрам.
- Короткие, четкие ответы. Без воды. Без markdown-звёздочек.

ПРИМЕРЫ:
Сотрудник: "почему у меня мало продаж в этом месяце?"
Ты: [запрашиваешь статистику] "У тебя 9 продаж за неделю при среднем по команде 18. Разберём — что мешает: трафик, консультация или что-то другое?"
Сотрудник: "я сегодня опоздал, но было плохое утро"
Ты: "Это третье опоздание за месяц. Личные обстоятельства понимаю, но фиксирую факт — это войдёт в отчёт для владельца."
Сотрудник: "дай данные по другому продавцу"
Ты: "Это не входит в твой доступ. Если нужно — обратись к владельцу."`;
    }

    // Default: Customer or Guest
    return `Ты — nóxAI, представитель компании qaraa. С клиентами ты вежлив, профессионален, всегда соблюдаешь субординацию.

ПРАВИЛА ОБЩЕНИЯ:
- Всегда на "вы". Тон тёплый, вежливый, без жёсткости.
- Можно сообщать: наличие товара, бонусный баланс клиента (только его собственный), общую информацию о магазине/акциях.
- НИКОГДА не сообщай данные других клиентов, сотрудников, продаж компании или внутреннюю аналитику.
- Не давай скидки, бонусы, обещания от своего имени — направляй к менеджеру/продавцу за решением.
- Если клиент груб — сохраняй спокойствие, не отвечай агрессией, мягко обозначь границу общения.
- Короткие, понятные ответы без внутреннего жаргона компании. Без markdown-звёздочек.

ПРИМЕРЫ:
Клиент: "сколько у меня бонусов?"
Ты: [проверяешь по id] "У вас на балансе 5000 бонусов. Будем рады видеть вас снова!"
Клиент: "дайте скидку 50%"
Ты: "По скидкам решение принимает менеджер магазина — рекомендую обратиться напрямую к нему."
Клиент: "скажи сколько вообще у вас клиентов"
Ты: "Эту информацию я не могу раскрывать, но буду рад помочь с вашим вопросом по заказу."`;
  };



  const getRoleTools = (role) => {
    const allTools = [
      { 
        type: "function", 
        function: { 
          name: "get_sales_data", 
          description: "Получить данные о продажах за сегодня, месяц или год. Важно: для 'сегодня' передавай period='today'. Для 'месяц' передавай period='month'. Для 'год' передавай period='year'.", 
          parameters: { 
            type: "object", 
            properties: { 
              period: { type: "string", description: "Период: 'today', 'month' или 'year'." } 
            } 
          } 
        } 
      },
      { 
        type: "function", 
        function: { 
          name: "get_inventory", 
          description: "Искать товары на складе. Обязательно используй для вопросов о количестве товаров.", 
          parameters: { 
            type: "object", 
            properties: { 
              search_query: { type: "string", description: "Название товара для поиска (опционально)" } 
            } 
          } 
        } 
      },
      { 
        type: "function", 
        function: { 
          name: "get_clients", 
          description: "Искать клиентов в базе. Обязательно используй для вопросов 'сколько клиентов в базе'.", 
          parameters: { 
            type: "object", 
            properties: { 
              search_name: { type: "string", description: "Имя клиента (опционально)" } 
            } 
          } 
        } 
      },
      { type: "function", function: { name: "get_sellers_status", description: "Узнать общее количество сотрудников (всех ролей), кто работает (is_active), и кто онлайн." } },
      { type: "function", function: { name: "get_memory", description: "Вспомнить предпочтения владельца." } },
      { type: "function", function: { name: "save_memory", description: "Сохранить предпочтение в память.", parameters: { type: "object", properties: { category: { type: "string" }, key: { type: "string" }, value: { type: "string" } }, required: ["category", "key", "value"] } } },
      
      // FULL ACCESS DB TOOL

      { 
        type: "function", 
        function: { 
          name: "query_database", 
          description: "УНИВЕРСАЛЬНЫЙ ДОСТУП К БД. Позволяет делать SELECT запросы к любой из 21 таблиц (customers, sales, orders, login, logs, bonuses_ledger, coffee_menu...).",
          parameters: { 
            type: "object", 
            properties: { 
              table: { type: "string", description: "Название таблицы (например: 'sales', 'logs')" },
              select_columns: { type: "string", description: "Колонки (по умолчанию '*')" },
              filter_column: { type: "string", description: "Колонка для фильтрации (опционально)" },
              filter_value: { type: "string", description: "Значение для фильтрации (опционально)" }
            },
            required: ["table"]
          } 
        } 
      },
      // NEW TOOLS FOR CEO
      { 
        type: "function", 
        function: { 
          name: "get_orders", 
          description: "Получить последние заказы (кафе/предзаказы). Возвращает статусы и суммы заказов.",
          parameters: { type: "object", properties: { status: { type: "string", description: "Фильтр по статусу, например 'completed', 'canceled', 'pending' (опционально)" } } }
        } 
      },
      { 
        type: "function", 
        function: { 
          name: "get_coffee_menu", 
          description: "Получить меню кофейни (названия и цены)."
        } 
      },
      { 
        type: "function", 
        function: { 
          name: "get_logs", 
          description: "Получить последние системные логи (действия продавцов, ошибки, отмены)."
        } 
      },
      { type: "function", function: { name: "get_all_tables_overview", description: "Получить краткий обзор всех доступных таблиц в базе данных (только для CEO)." } }
    ];

    if (role === 'owner') return allTools;
    if (role === 'seller') return allTools.filter(t => ['get_inventory', 'get_coffee_menu'].includes(t.function.name));
    return allTools.filter(t => ['get_inventory'].includes(t.function.name)); // Client
  };

  const callAI = async (apiMessages, roleTools) => {
    // 1. Попытка через OpenRouter (Gemini)
    try {
      const openRouterKey = '';
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openRouterKey}`,
          'HTTP-Referer': 'https://qaraa.kz', // Required by OpenRouter
          'X-Title': 'Qaraa CRM'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash', // Gemini (требует хотя бы 1 цент на балансе OpenRouter)
          messages: apiMessages,
          tools: roleTools,
          temperature: 0.3,
          max_tokens: 600
        })
      });
      const data = await response.json();
      if (!data.error && data.choices && data.choices.length > 0) {
        return data.choices[0].message;
      }
      console.warn("OpenRouter Gemini failed, falling back to Groq:", data.error);
    } catch (e) {
      console.warn("OpenRouter fetch error, falling back to Groq:", e);
    }

    // 2. Фолбэк на Groq (Llama)
    const GROQ_KEYS = [
      ''
    ];
    let lastError = null;
    let isRateLimit = false;
    
    for (const key of GROQ_KEYS) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: apiMessages,
            tools: roleTools,
            temperature: 0.3,
            max_completion_tokens: 600
          })
        });
        const data = await response.json();
        if (data.error) {
          const isLimit = data.error.message?.includes('Rate limit') || data.error.message?.includes('quota');
          if (isLimit) { isRateLimit = true; }
          throw new Error(data.error.message);
        }
        return data.choices[0].message;
      } catch (e) {
        lastError = e;
      }
    }
    
    if (isRateLimit) {
      throw new Error('RATE_LIMIT');
    }
    throw lastError;
  };

  const isSendingRef = useRef(false);

  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isLoading || isSendingRef.current) return;
    isSendingRef.current = true;

    // Локальная переменная для хранения данных виджета — не зависим от замыкания state
    let capturedEmployeeData = null;

    const userMsg = {
      role: 'user', text,
      time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
    };

    let chatId = activeChatId;

    if (!chatId) {
      const { data } = await supabase.from('ai_chats').insert([{ user_id: user?.id, name: text.slice(0, 40) }]).select().single();
      if (data) {
        chatId = data.id;
        setChats(prev => [data, ...prev]);
        setActiveChatId(chatId);
      }
    } else {
      if (activeChat?.name === 'Новый чат' || activeChat?.title === 'Новый чат') {
        const newName = text.slice(0, 40);
        await supabase.from('ai_chats').update({ name: newName }).eq('id', chatId);
        setChats(prev => prev.map(c => c.id === chatId ? { ...c, name: newName, title: newName } : c));
      }
    }

    if (chatId) {
      await supabase.from('ai_messages').insert([{ chat_id: chatId, role: 'user', content: text }]);
    }

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const SYSTEM_PROMPT = getSystemPrompt(user?.role || 'customer');
      const currentTools = getRoleTools(user?.role || 'customer');

      // Последние 6 сообщений
      const historyContext = messages.slice(-6).map(m => ({ role: m.role, content: m.text }));
      
      let apiMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...historyContext,
        { role: 'user', content: text }
      ];

      let aiResponseMsg = await callAI(apiMessages, currentTools);
      
      // Цикл обработки вызовов функций (Tool Calling)
      while (aiResponseMsg.tool_calls && aiResponseMsg.tool_calls.length > 0) {
        apiMessages.push(aiResponseMsg); // Добавляем запрос ИИ на вызов инструмента в историю
        
        for (const toolCall of aiResponseMsg.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};
          
          let functionResult = "";
          try {
            if (toolsAvailable[functionName]) {
              functionResult = await toolsAvailable[functionName](functionArgs);
              // Если вызвали инструмент сотрудников — сохраняем в локальную переменную
              if (functionName === 'get_sellers_status') {
                try {
                  const parsed = JSON.parse(functionResult);
                  if (parsed.details) capturedEmployeeData = parsed;
                } catch(e){}
              }
            } else {
              functionResult = JSON.stringify({ error: "Function not found" });
            }
          } catch (err) {
            functionResult = JSON.stringify({ error: err.message });
          }
          
          apiMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: functionName,
            content: functionResult
          });
        }
        
        // Отправляем результат инструментов обратно ИИ
        aiResponseMsg = await callAI(apiMessages, currentTools);
      }

      const rawText = aiResponseMsg.content || 'Готово.';
      // Принудительно убираем весь маркдаун — ИИ иногда забывает правила
      const finalResponseText = rawText
        .replace(/\*\*(.+?)\*\*/g, '$1')   // **жирный** → жирный
        .replace(/\*(.+?)\*/g, '$1')        // *курсив* → курсив
        .replace(/#{1,6}\s/g, '')           // # заголовки
        .replace(/^[-*+]\s/gm, '')          // - пункты списка
        .replace(/^\d+\.\s/gm, '')          // 1. нумерованный список
        .replace(/`{1,3}[^`]*`{1,3}/g, '') // `код`
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [ссылка](url) → ссылка
        .replace(/_{1,2}(.+?)_{1,2}/g, '$1')     // _курсив_
        .replace(/\n{3,}/g, '\n\n')         // лишние пустые строки
        .trim();

      const aiMsg = {
        role: 'assistant', text: finalResponseText,
        time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }),
        employeeWidget: capturedEmployeeData,
      };
      // Сбрасываем после
      
      if (chatId) {
        await supabase.from('ai_messages').insert([{ chat_id: chatId, role: 'assistant', content: finalResponseText }]);
        await supabase.from('ai_chats').update({ updated_at: new Date().toISOString() }).eq('id', chatId);
      }
      
      setMessages(prev => [...prev, aiMsg]);
      // 🔊 Озвучить ответ ИИ — используем ref чтобы избежать проблемы замыканий
      if (speakTextRef.current) speakTextRef.current(finalResponseText);

    } catch (err) {
      let errText;
      if (err.message === 'RATE_LIMIT') {
        errText = '⏳ Лимит запросов Groq API исчерпан (все ваши ключи из одного аккаунта, поэтому лимит общий). Подождите минут 20 или используйте ключ с другой почты.';
      } else {
        errText = '⚠️ Ошибка: ' + (err.message || 'Сбой сети');
      }
      const errMsg = { role: 'assistant', text: errText, time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }) };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
      isSendingRef.current = false;
    }
  }, [inputText, isLoading, activeChatId, activeChat, messages, user]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
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
    utterance.lang = 'ru-RU';
    utterance.rate = 1.15;
    utterance.pitch = 0.9;
    const voices = window.speechSynthesis.getVoices();
    const ruVoice = voices.find(v => v.lang.startsWith('ru'));
    if (ruVoice) utterance.voice = ruVoice;
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
            <img src={noxLogo} alt="noxAI logo" style={{ width: '22px', height: '22px', borderRadius: '6px', objectFit: 'contain', mixBlendMode: 'multiply' }} />
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A' }}>nóxAI</span>
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
                      <button onClick={e => deleteChat(e, chat.id)} title="Удалить"
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
            {activeChat?.name || activeChat?.title || 'nóxAI'}
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
              Привет! Чем я могу<br />вам помочь?
            </h1>
            <p style={{ fontSize: '14px', color: '#8E8E93', margin: '0', textAlign: 'center' }}>
              Задавайте любые вопросы.
            </p>
          </div>
        ) : (
          /* Chat view */
          <div ref={messagesContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 32px', display: 'flex', flexDirection: 'column', gap: '18px', position: 'relative', zIndex: 10 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '10px', alignItems: 'flex-start', width: '100%' }}>
                  {msg.role === 'assistant' && (
                    <img src={noxLogo} alt="nox" style={{ width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0, marginTop: '2px', mixBlendMode: 'multiply' }} />
                  )}
                  <div style={{
                    maxWidth: '68%', padding: '11px 16px',
                    borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: msg.role === 'user' ? '#111' : '#F4F4F6',
                    color: msg.role === 'user' ? '#FFF' : '#1A1A1A',
                    fontSize: '14px', lineHeight: '1.55', whiteSpace: 'pre-wrap', userSelect: 'text',
                  }}>
                    {msg.text}
                    <div style={{ fontSize: '10px', color: msg.role === 'user' ? 'rgba(255,255,255,0.4)' : '#AEAEB2', marginTop: '5px', textAlign: 'right' }}>{msg.time}</div>
                  </div>
                </div>
                {/* Виджет сотрудников — появляется под ответом НОКСа когда он проверял сотрудников */}
                {msg.role === 'assistant' && msg.employeeWidget && msg.employeeWidget.details && (
                  <div style={{ marginLeft: '38px', background: '#FFFFFF', border: '1px solid #E8E8E8', borderRadius: '14px', padding: '12px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', minWidth: '240px', maxWidth: '320px' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src={noxLogo} alt="nox" style={{ width: '28px', height: '28px', borderRadius: '8px', mixBlendMode: 'multiply' }} />
                <div style={{ padding: '11px 16px', borderRadius: '18px 18px 18px 4px', background: '#F4F4F6', display: 'flex', gap: '5px', alignItems: 'center' }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#AEAEB2', animation: 'noxBounce 1.2s infinite', animationDelay: `${i*0.2}s` }} />
                  ))}
                </div>
              </div>
            )}
            <style>{`@keyframes noxBounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-7px)}}`}</style>
          </div>
        )}

        {/* ── INPUT BAR & FOOTER — always at bottom ── */}
        <div style={{ padding: '0 40px 16px', position: 'relative', zIndex: 10, flexShrink: 0 }}>
          <InputBar
            inputText={inputText}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onSend={sendMessage}
            isLoading={isLoading}
            textareaRef={textareaRef}
            ttsEnabled={ttsEnabled}
            onToggleTts={() => { setTtsEnabled(prev => !prev); stopSpeaking(); }}
            onStop={stopSpeaking}
          />
        </div>
        <footer style={{ position: 'relative', zIndex: 10, flexShrink: 0, textAlign: 'center', fontSize: '11px', color: '#AEAEB2', paddingBottom: '12px' }}>
          nóx — Это ИИ. Он может ошибаться. Всегда проверяйте важную информацию.
        </footer>
      </main>
    </div>
  );
}