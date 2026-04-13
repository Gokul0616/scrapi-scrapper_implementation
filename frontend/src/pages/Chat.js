import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AlertModal from '../components/AlertModal';
import { Send, Trash2, Plus, Copy, Check, ChevronDown, ArrowUp, Navigation, MessageSquare, Clock, Search, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const generateUUID = () => {
  try {
    return window.crypto.randomUUID();
  } catch (e) {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};

const groupConversations = (convs) => {
  const groups = {
    'Today': [],
    'Yesterday': [],
    'Earlier': []
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  convs.forEach(c => {
    const date = new Date(c.updated_at);
    if (date >= today) groups['Today'].push(c);
    else if (date >= yesterday) groups['Yesterday'].push(c);
    else groups['Earlier'].push(c);
  });

  return Object.entries(groups).filter(([_, items]) => items.length > 0);
};

const isDuplicateMessage = (prev, newMessage) => {
  return prev.some(m =>
    m.role === newMessage.role &&
    m.content === newMessage.content &&
    (Math.abs(new Date(m.timestamp) - new Date(newMessage.timestamp)) < 3000)
  );
};

/* ── Mira sparkle icon ─────────────────────── */
const MiraIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z"
      fill="currentColor" fillOpacity="0.95" />
    <path d="M19 3L19.8 5.8L22.5 6.5L19.8 7.2L19 10L18.2 7.2L15.5 6.5L18.2 5.8L19 3Z"
      fill="currentColor" fillOpacity="0.6" />
    <path d="M6 14L6.6 16.2L9 17L6.6 17.8L6 20L5.4 17.8L3 17L5.4 16.2L6 14Z"
      fill="currentColor" fillOpacity="0.6" />
  </svg>
);

/* ── Starter prompts ────────────────────────── */
const PROMPTS = [
  { label: 'Go to Actors page', sub: 'Navigate to your scrapers' },
  { label: 'Show me my latest runs', sub: 'View recent scraper activity' },
  { label: 'Export my data as CSV', sub: 'Download a dataset export' },
  { label: 'Open billing settings', sub: 'View usage & upgrade plan' },
];

/* ── Typing animation ───────────────────────── */
const TypingDots = () => (
  <span className="inline-flex items-center gap-[3px] py-0.5">
    {[0, 150, 300].map((d, i) => (
      <span key={i} className="w-[5px] h-[5px] rounded-full bg-muted-foreground/50 animate-bounce"
        style={{ animationDelay: `${d}ms`, animationDuration: '900ms' }} />
    ))}
  </span>
);

/* ── Copy Button ────────────────────────────── */
const CopyBtn = ({ text, className = '' }) => {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000); }}
      className={`flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors ${className}`}
      title="Copy"
    >
      {ok ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
      <span>{ok ? 'Copied' : 'Copy'}</span>
    </button>
  );
};

/* ── Markdown components ────────────────────── */
const mdComponents = {
  p: ({ children }) => <p className="mb-2.5 last:mb-0 leading-[1.75]">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic opacity-75">{children}</em>,
  h1: ({ children }) => <h1 className="text-lg font-bold mb-3 mt-4 text-foreground">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-semibold mb-2 mt-4 text-foreground">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold mb-1.5 mt-3 text-foreground">{children}</h3>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-border pl-4 text-muted-foreground italic my-3 leading-relaxed">
      {children}
    </blockquote>
  ),
  code: ({ inline, children }) => {
    const str = String(children).replace(/\n$/, '');
    if (inline) return (
      <code className="bg-muted/70 text-foreground px-1.5 py-0.5 rounded-md text-[0.82em] font-mono border border-border/50">
        {str}
      </code>
    );
    return (
      <div className="relative group my-3 rounded-xl overflow-hidden border border-border/60">
        <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b border-border/50">
          <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">code</span>
          <button
            onClick={() => { navigator.clipboard.writeText(str); }}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <Copy size={10} /> copy
          </button>
        </div>
        <pre className="overflow-x-auto px-4 py-3 text-[0.82em] font-mono leading-relaxed text-foreground bg-muted/20">
          {str}
        </pre>
      </div>
    );
  },
  hr: () => <hr className="border-border/40 my-5" />,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="text-foreground underline underline-offset-2 decoration-border hover:decoration-foreground transition-colors">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-3 rounded-lg border border-border/60">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="bg-muted/50 px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground border-b border-border/60 uppercase tracking-wide">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2.5 border-b border-border/30 last:border-0">{children}</td>
  ),
};

/* ══════════════════════════════════════════════
   Main Chat Page
   Restored & Fixed Version
══════════════════════════════════════════════ */
export default function Chat() {
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const location = useLocation();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  /* Multi-thread states */
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(conversationId || null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const bottomRef = useRef(null);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const justStartedRef = useRef(false);

  const [alertModal, setAlertModal] = useState({ show: false, type: 'info', title: '', message: '' });
  const [confirmModal, setConfirmModal] = useState({ show: false, type: 'warning', title: '', message: '', onConfirm: null });

  /* scroll */
  const scrollToBottom = useCallback((instant = false) => {
    bottomRef.current?.scrollIntoView({ behavior: instant ? 'auto' : 'smooth' });
  }, []);

  useEffect(() => {
    if (autoScroll) scrollToBottom();
  }, [messages, loading, autoScroll, scrollToBottom]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setAutoScroll(near);
    setShowScrollBtn(!near && messages.length > 0);
  };

  /* fetch conversation list */
  const fetchConversations = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/chat/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversations(res.data.conversations || []);
    } catch (err) {
      console.error("Failed to fetch conversations", err);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  /* Sync URL with state */
  useEffect(() => {
    if (conversationId && conversationId !== currentConversationId) {
      setCurrentConversationId(conversationId);
      localStorage.setItem('mira_last_conversation_id', conversationId);
    } else if (!conversationId && location.pathname === '/chat') {
      // If we're at /chat, try to redirect to last active thread
      const lastId = localStorage.getItem('mira_last_conversation_id');
      if (lastId) {
        navigate(`/chat/${lastId}`, { replace: true });
      } else {
        setCurrentConversationId(null);
      }
    }
  }, [conversationId, navigate, location.pathname]);

  /* history restricted by conversation_id */
  const fetchHistory = useCallback(async (isSilent = false) => {
    if (!currentConversationId) {
      setMessages([]);
      setHistoryLoaded(true);
      return;
    }

    try {
      if (!isSilent) setLoading(true);
      const token = localStorage.getItem('token');
      const url = `${API}/chat/global/history?conversation_id=${currentConversationId}&limit=60`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const hist = (res.data.history || []).map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.created_at || new Date().toISOString(),
      }));
      // If we just started a new chat locally and the server returns empty,
      // don't clear the messages yet - our local newUserMsg is the source of truth.
      if (justStartedRef.current && hist.length === 0) {
        console.log("Preserving local message for new chat initiation...");
        setLoading(true);
      } else {
        setMessages(hist);
        justStartedRef.current = false;
        
        // Busy Recovery Logic: If last message is from user, Mira is likely still thinking
        if (hist.length > 0 && hist[hist.length - 1].role === 'user') {
          setLoading(true);
        } else {
          setLoading(false);
        }
      }

      if (!isSilent) setTimeout(() => scrollToBottom(true), 80);
    } catch {
      setLoading(false);
    }
    finally {
      setHistoryLoaded(true);
    }
  }, [currentConversationId, scrollToBottom]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  /* Real-time sync listener (WebSocket integration) */
  useEffect(() => {
    const handleUpdate = (e) => {
      const { conversation_id, message } = e.detail;
      if (conversation_id === currentConversationId) {
        console.log("Real-time message received for current thread");
        setMessages((prev) => {
          if (isDuplicateMessage(prev, message)) return prev;
          return [...prev, message];
        });
        setLoading(false);
        setTimeout(() => scrollToBottom(), 100);
      }
    };

    window.addEventListener('mira_chat_update', handleUpdate);
    return () => window.removeEventListener('mira_chat_update', handleUpdate);
  }, [currentConversationId, scrollToBottom]);

  /* Fallback Polling for rejoined "busy" chats */
  useEffect(() => {
    let pollInterval;
    if (loading && currentConversationId && messages.length > 0 && messages[messages.length - 1].role === 'user') {
      console.log("Starting fallback polling for busy thread...");
      pollInterval = setInterval(() => {
        fetchHistory(true); // silent fetch
      }, 4000);
    }
    return () => clearInterval(pollInterval);
  }, [loading, currentConversationId, messages, fetchHistory]);

  /* textarea auto-height */
  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 220) + 'px';
  };

  /* command routing */
  const executeCommand = async (data) => {
    if (!data?.action) return;
    const { action, page, run_id, format, actor_id, message: actionMessage } = data;

    // Show visual feedback
    if (actionMessage) {
      setActionFeedback(actionMessage);
      setTimeout(() => setActionFeedback(null), 3000);
    }

    const pageMap = {
      home: '/home', actors: '/actors', runs: '/runs', datasets: '/datasets',
      store: '/store', settings: '/settings', billing: '/billing',
      'access-keys': '/access-keys', schedules: '/schedules',
    };
    if (action === 'navigate' && page)
      setTimeout(() => { if (pageMap[page]) navigate(pageMap[page]); else if (page.startsWith('/')) navigate(page); }, 700);

    if (action === 'open_actor' && actor_id) setTimeout(() => navigate(`/actors/${actor_id}`), 700);
    if (action === 'view_run' && run_id) setTimeout(() => navigate(`/dataset/${run_id}`), 700);

    // Execute full form fill and run automation
    if (action === 'fill_and_run' && run_id) {
      setTimeout(() => {
        setActionFeedback(`✓ Scraper started! Run ID: ${run_id.substring(0, 8)}...`);
        setTimeout(() => {
          navigate('/runs');
          setActionFeedback(null);
        }, 1500);
      }, 1000);
    }

    // Execute export
    if (action === 'export' && run_id) {
      setTimeout(async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await axios.get(`${API}/datasets/export/${run_id}?format=${format || 'json'}`, {
            headers: { Authorization: `Bearer ${token}` }, responseType: 'blob',
          });
          const url = window.URL.createObjectURL(new Blob([res.data]));
          const a = Object.assign(document.createElement('a'), { href: url, download: `export_${run_id}.${format || 'json'}` });
          document.body.appendChild(a); a.click(); a.remove();

          setActionFeedback(`✓ Export downloaded successfully!`);
          setTimeout(() => setActionFeedback(null), 3000);
        } catch {
          setActionFeedback(`✗ Export failed. Please try again.`);
          setTimeout(() => setActionFeedback(null), 3000);
        }
      }, 500);
    }
  };

  /* send */
  const send = async (override) => {
    const text = (override ?? input).trim();
    if (!text || loading) return;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setAutoScroll(true);

    let cid = currentConversationId;

    // If starting a new chat, generate ID immediately for instant URL sync
    if (!cid) {
      cid = generateUUID();
      justStartedRef.current = true;
      setCurrentConversationId(cid);
      localStorage.setItem('mira_last_conversation_id', cid);
      navigate(`/chat/${cid}`, { replace: true });
    }

    const newUserMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages((p) => [...p, newUserMsg]);
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API}/chat/global`, {
        message: text,
        conversation_id: cid
      }, { headers: { Authorization: `Bearer ${token}` } });

      const assistantMsg = {
        role: 'assistant',
        content: res.data.response,
        timestamp: res.data.timestamp || new Date().toISOString()
      };

      // Refresh conversation list for metadata (titles, etc)
      fetchConversations();

      setMessages((p) => {
        if (isDuplicateMessage(p, assistantMsg)) return p;
        return [...p, assistantMsg];
      });
      await executeCommand(res.data);
    } catch {
      setMessages((p) => [...p, { role: 'assistant', content: "Sorry, I couldn't process that. Please try again.", timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const onKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  const clearHistory = (targetId) => {
    const cid = targetId || currentConversationId;
    if (!cid) return;

    setConfirmModal({
      show: true, type: 'warning', title: 'Delete conversation',
      message: 'This will permanently delete this conversation history.',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          await axios.delete(`${API}/chat/global/history`, {
            headers: { Authorization: `Bearer ${token}` },
            data: { conversation_id: cid }
          });

          if (cid === currentConversationId) {
            setMessages([]);
            setCurrentConversationId(null);
            localStorage.removeItem('mira_last_conversation_id');
            navigate('/chat', { replace: true });
          }
          fetchConversations();
        } catch {
          setAlertModal({ show: true, type: 'error', title: 'Error', message: 'Failed to delete history.' });
        }
      },
    });
  };

  const startNewChat = () => {
    const newId = generateUUID();
    setCurrentConversationId(newId);
    setMessages([]);
    localStorage.setItem('mira_last_conversation_id', newId);
    navigate(`/chat/${newId}`);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const isEmpty = messages.length === 0 && !loading;
  const canSend = input.trim().length > 0 && !loading;

  return (
    <div className="flex h-full bg-background overflow-hidden text-foreground">

      {/* ── Sidebar ────────────────────────────────── */}
      <div className={`
        ${sidebarOpen ? 'w-[200px]' : 'w-0'} 
        h-full bg-muted/20 border-r border-border/40 flex flex-col shrink-0 transition-all duration-300 overflow-hidden relative
      `}>
        <div className="p-3 flex flex-col h-full w-[200px]">
          {/* New Chat Button */}
          <button
            onClick={startNewChat}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/40 bg-muted/30 hover:bg-muted/60 transition-all duration-200 mb-6 group"
          >
            <Plus size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
            <span className="text-[13px] font-medium text-foreground/80 group-hover:text-foreground">New Chat</span>
          </button>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto pr-1 scrollbar-hide">
            {conversations.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-xs text-muted-foreground/50 italic">No history yet</p>
              </div>
            ) : (
              groupConversations(conversations).map(([groupName, items]) => (
                <div key={groupName} className="mb-4 last:mb-0">
                  <div className="px-3 mb-1.5 flex items-center">
                    <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">{groupName}</span>
                  </div>
                  <div className="space-y-0.5">
                    {items.map((c) => (
                      <div key={c.id} className="group relative">
                        <button
                          onClick={() => navigate(`/chat/${c.id}`)}
                          className={`
                            w-full text-left px-3 py-2 rounded-md transition-all duration-150 flex items-center gap-2.5
                            ${currentConversationId === c.id
                              ? 'bg-foreground/[0.04] text-foreground font-medium border-l-2 border-foreground/70 rounded-l-none'
                              : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                            }
                          `}
                        >
                          <MessageSquare size={13} className={`shrink-0 ${currentConversationId === c.id ? 'opacity-90' : 'opacity-40'}`} />
                          <span className="truncate flex-1 text-[13px] leading-tight">{c.title || 'New Conversation'}</span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); clearHistory(c.id); }}
                          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="pt-4 mt-auto border-t border-border/40 space-y-1">
            <div className="flex items-center gap-3 px-3 py-2 text-muted-foreground text-xs italic">
              <Clock size={12} />
              <span>Auto-saved natively</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Chat Area ─────────────────────────── */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">

        {/* Toggle Sidebar Button (Floating) */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute left-4 top-4 z-50 p-2 rounded-lg bg-background/50 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-background transition-all"
          title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>

        {/* Top Right Action Feedback Toast */}
        {actionFeedback && (
          <div className="absolute top-4 right-5 z-50 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg shadow-lg flex items-center space-x-2 animate-in slide-in-from-top-4 fade-in duration-300">
            <Navigation className="w-4 h-4 animate-pulse" />
            <span className="text-sm font-medium">{actionFeedback}</span>
          </div>
        )}

        {/* ── Header ─────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60 pl-16">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-foreground/8 flex items-center justify-center">
              <MiraIcon size={15} className="text-foreground/70" />
            </div>
            <span className="text-sm font-semibold text-foreground">
              {currentConversationId
                ? conversations.find(c => c.id === currentConversationId)?.title || 'Mira Assistant'
                : 'Mira Assistant'
              }
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={startNewChat}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150"
            >
              <Plus size={12} />New chat
            </button>
            {currentConversationId && (
              <button
                onClick={() => clearHistory()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all duration-150"
              >
                <Trash2 size={12} />Delete
              </button>
            )}
          </div>
        </div>

        {/* ── Messages ───────────────────────────────── */}
        <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto scrollbar-hide">
          {isEmpty ? (
            /* Welcome */
            <div className="flex flex-col items-center justify-center min-h-full py-16 px-6">
              <div className="w-12 h-12 rounded-2xl bg-foreground/8 flex items-center justify-center mb-5 border border-border/40">
                <MiraIcon size={24} className="text-foreground/70" />
              </div>
              <h2 className="text-[22px] font-semibold text-foreground mb-2 tracking-tight">How can I help you?</h2>
              <p className="text-sm text-muted-foreground mb-10 text-center max-w-sm leading-relaxed">
                I can navigate the app, run scrapers, export data, and answer any Scrapi question.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-[520px]">
                {PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => send(p.label)}
                    className="flex flex-col gap-0.5 px-4 py-3.5 rounded-xl border border-border/60 bg-card text-left hover:border-border hover:bg-muted/30 active:bg-muted/50 transition-all duration-150 group"
                  >
                    <span className="text-[13px] font-medium text-foreground">{p.label}</span>
                    <span className="text-[11px] text-muted-foreground leading-snug">{p.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Thread */
            <div className="max-w-[680px] mx-auto w-full px-5 py-8 space-y-0.5 animate-in fade-in duration-500">
              {messages.map((msg, i) => (
                <MessageRow key={i} msg={msg} />
              ))}
              {loading && (
                <div className="flex gap-3 py-4">
                  <div className="w-6 h-6 rounded-full bg-foreground/8 border border-border/40 flex items-center justify-center shrink-0 mt-0.5">
                    <MiraIcon size={12} className="text-foreground/60" />
                  </div>
                  <div className="pt-1 text-muted-foreground">
                    <TypingDots />
                    {messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                      <span className="ml-3 text-[12px] opacity-70 italic font-medium text-blue-500 animate-pulse">
                        Mira is thinking...
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* ── Scroll to bottom ──────────────────────── */}
        {showScrollBtn && (
          <div className="absolute bottom-[120px] inset-x-0 flex justify-center z-10 pointer-events-none">
            <button
              onClick={() => { setAutoScroll(true); scrollToBottom(); }}
              className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border/70 shadow-sm text-[11px] text-muted-foreground hover:text-foreground transition-all"
            >
              <ChevronDown size={12} />Scroll to latest
            </button>
          </div>
        )}

        {/* ── Input ─────────────────────────────────── */}
        <div className="px-4 pb-5 pt-3">
          <div className="max-w-[680px] mx-auto">

            <div
              className={`
                relative flex flex-col rounded-2xl border transition-all duration-200
                ${inputFocused
                  ? 'border-foreground/30 bg-card shadow-[0_0_0_4px_hsl(var(--foreground)/0.07)]'
                  : 'border-border/35 bg-muted/15 hover:border-border/60 hover:bg-muted/25'
                }
              `}
            >
              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={input}
                rows={1}
                placeholder="Message Mira…"
                disabled={loading}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onChange={(e) => { setInput(e.target.value); resizeTextarea(); }}
                onKeyDown={onKeyDown}
                className="
                  w-full bg-transparent text-[14px] text-foreground
                  placeholder:text-muted-foreground/50
                  resize-none outline-none leading-[1.65]
                  px-4 pt-3.5 pb-3
                  min-h-[52px] max-h-[220px]
                  scrollbar-hide disabled:opacity-50
                "
                style={{ height: '52px' }}
              />

              {/* Bottom row: hint + send button */}
              <div className="flex items-center justify-between px-3 pb-2.5">
                <span className="text-[11px] text-muted-foreground/40 select-none">
                  {inputFocused
                    ? <><kbd className="font-mono">↵</kbd> send · <kbd className="font-mono">⇧↵</kbd> newline</>
                    : 'Ask Mira anything about Scrapi'
                  }
                </span>

                <button
                  onClick={() => send()}
                  disabled={!canSend}
                  className={`
                    w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                    transition-all duration-150 active:scale-95
                    ${canSend
                      ? 'bg-foreground text-background hover:opacity-80 shadow-sm'
                      : 'bg-muted/50 text-muted-foreground/40 cursor-not-allowed'
                    }
                  `}
                >
                  <ArrowUp size={15} />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Modals */}
        <AlertModal show={alertModal.show} onClose={() => setAlertModal({ ...alertModal, show: false })}
          type={alertModal.type} title={alertModal.title} message={alertModal.message} confirmText="OK" />
        <AlertModal show={confirmModal.show} onClose={() => setConfirmModal({ ...confirmModal, show: false })}
          onConfirm={confirmModal.onConfirm} type={confirmModal.type} title={confirmModal.title}
          message={confirmModal.message} showCancel confirmText="Delete" cancelText="Cancel" />
      </div>
    </div>
  );
}

/* ── Message Row ─────────────────────────────── */
function MessageRow({ msg }) {
  const isUser = msg.role === 'user';

  if (isUser) {
    return (
      <div className="flex flex-col items-end py-2.5 group">
        <div className="
          max-w-[75%] px-4 py-2.5 rounded-2xl rounded-br-md
          bg-secondary text-secondary-foreground
          text-[14px] leading-[1.65] whitespace-pre-wrap
          border border-border/40
        ">
          {msg.content}
        </div>
        <div className="mt-1.5 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pr-1">
          <span className="text-[10px] text-muted-foreground/35">
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <CopyBtn text={msg.content} />
        </div>
      </div>
    );
  }

  /* Assistant — Claude-style: no bubble, avatar + flowing text */
  return (
    <div className="flex gap-3 py-4 group">
      <div className="w-6 h-6 rounded-full bg-foreground/8 border border-border/40 flex items-center justify-center shrink-0 mt-[3px]">
        <MiraIcon size={12} className="text-foreground/60" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] text-foreground leading-[1.75]">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {msg.content}
          </ReactMarkdown>
        </div>
        {/* Actions (hover reveal) */}
        <div className="mt-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <CopyBtn text={msg.content} />
          <span className="text-[10px] text-muted-foreground/35">
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
}
