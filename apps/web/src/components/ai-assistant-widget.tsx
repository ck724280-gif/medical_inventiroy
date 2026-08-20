'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../stores/auth-store';
import { apiClient } from '../lib/api-client';
import {
  Bot,
  Sparkles,
  X,
  Send,
  Trash2,
  Minimize2,
  TrendingUp,
  Package,
  AlertTriangle,
  HelpCircle,
  CreditCard,
  Award,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  { label: "Today's Sales & Profit", icon: TrendingUp, prompt: "Aaj ki total sales, gross profit aur payment split batao." },
  { label: "Stock & Inventory Valuation", icon: Package, prompt: "Total inventory stock aur purchase valuation kitna hai?" },
  { label: "Expiring Medicines", icon: AlertTriangle, prompt: "Kon-kon si medicines agle 60 din me expire hone wali hain?" },
  { label: "Top Selling Items", icon: Award, prompt: "Top 5 highest selling medicines kon si hain?" },
  { label: "Supplier Outstanding", icon: CreditCard, prompt: "Suppliers aur distributors ka kitna payment baki hai?" },
  { label: "Print Receipt Setup Guide", icon: HelpCircle, prompt: "Thermal receipt aur A4/A5 invoice layout kaise change karein?" },
];

export function AiAssistantWidget() {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `👋 **Namaste Super Admin!** Main aapka **MedCare AI Pharmacy Co-pilot** hoon.\n\nAap mujhse real-time **Stock valuation, Today's Profit & Loss, Expiring batches, Supplier payables** ya ERP use karne ka koi bhi tarika pooch sakte hain!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if user is Super Admin or Owner
  const isSuperAdmin =
    user?.roles?.some(
      (r: any) =>
        r === 'OWNER' ||
        r === 'ADMIN' ||
        r.name === 'OWNER' ||
        r.name === 'ADMIN'
    ) || user?.email === 'admin@medcare.com';

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  if (!user || !isSuperAdmin) {
    return null;
  }

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend || textToSend.trim() === '' || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      // Build history for Gemini API
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-6)
        .map((m) => ({
          role: m.sender === 'user' ? ('user' as const) : ('model' as const),
          parts: [{ text: m.text }],
        }));

      const res = await apiClient.post('/ai-assistant/chat', {
        message: textToSend.trim(),
        history,
      });

      const replyText =
        res.data?.response || res.data?.data?.response || 'Aapke sawaal ka jawaab process ho gaya hai.';

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        sender: 'assistant',
        text: `⚠️ Maaf kijiye, abhi server connect nahi ho paaya: ${err.response?.data?.message || err.message}. Kripya dobara try karein.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome-restart',
        sender: 'assistant',
        text: `Chat history cleared! Naya sawal puchein.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // Simple Markdown renderer for tables, lists, bold text
  const renderFormattedMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let inTable = false;
    let tableHeader: string[] = [];
    let tableRows: string[][] = [];

    const flushTable = (keyIndex: number) => {
      if (inTable && tableRows.length > 0) {
        elements.push(
          <div key={`table-${keyIndex}`} className="my-2.5 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="min-w-full text-[11px] text-left">
              {tableHeader.length > 0 && (
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    {tableHeader.map((th, i) => (
                      <th key={i} className="px-2.5 py-1.5">{th}</th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white/60 dark:bg-slate-900/60">
                {tableRows.map((tr, rIndex) => (
                  <tr key={rIndex} className="hover:bg-sky-50/50 dark:hover:bg-slate-800/40">
                    {tr.map((td, cIndex) => (
                      <td key={cIndex} className="px-2.5 py-1.5">{td}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        inTable = false;
        tableHeader = [];
        tableRows = [];
      }
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Check Table Row
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const cells = trimmed
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());

        // Skip separator line |---|---|
        if (cells.every((c) => c.replace(/-/g, '').trim() === '')) {
          return;
        }

        if (!inTable) {
          inTable = true;
          tableHeader = cells;
        } else {
          tableRows.push(cells);
        }
        return;
      } else {
        if (inTable) {
          flushTable(index);
        }
      }

      // Headings
      if (trimmed.startsWith('### ')) {
        elements.push(
          <h4 key={index} className="text-xs font-bold text-sky-600 dark:text-sky-400 mt-2 mb-1">
            {trimmed.replace('### ', '')}
          </h4>
        );
        return;
      }

      // Bullet points
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const bulletText = trimmed.slice(2);
        elements.push(
          <li key={index} className="ml-4 list-disc text-xs text-slate-800 dark:text-slate-200 my-0.5">
            <span dangerouslySetInnerHTML={{ __html: formatInline(bulletText) }} />
          </li>
        );
        return;
      }

      if (trimmed === '') {
        elements.push(<div key={index} className="h-1.5" />);
        return;
      }

      // Normal paragraph
      elements.push(
        <p key={index} className="text-xs text-slate-800 dark:text-slate-200 my-1 leading-relaxed">
          <span dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
        </p>
      );
    });

    if (inTable) {
      flushTable(lines.length);
    }

    return elements;
  };

  const formatInline = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-950 dark:text-white">$1</strong>')
      .replace(/\`(.*?)\`/g, '<code class="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[10px] text-sky-600 dark:text-sky-400">$1</code>');
  };

  return (
    <>
      {/* ── FLOATING TRIGGER BUTTON (Bottom-Right) ───────────────────── */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-600 bg-[length:200%_auto] hover:bg-right transition-all duration-300 text-white rounded-full shadow-2xl shadow-sky-600/50 hover:scale-105 active:scale-95 cursor-pointer font-bold text-xs"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            <Bot className="w-5 h-5" />
            <span className="tracking-wide">AI Co-pilot</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          </button>
        </div>
      )}

      {/* ── CHAT WINDOW MODAL / DRAWER ─────────────────────────────── */}
      {isOpen && (
        <div
          className={`fixed right-4 sm:right-6 bottom-4 sm:bottom-6 z-50 transition-all duration-300 flex flex-col bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl shadow-slate-900/30 overflow-hidden ${
            isMinimized
              ? 'w-72 h-14'
              : 'w-[94vw] sm:w-[440px] md:w-[480px] h-[580px] max-h-[88vh]'
          }`}
        >
          {/* Top Bar Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-sky-600 to-indigo-600 text-white flex items-center justify-between flex-shrink-0 select-none shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/30 backdrop-blur-sm shadow-inner">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-xs tracking-wide">MedCare AI Assistant</h3>
                  <span className="px-1.5 py-0.2 bg-emerald-400 text-emerald-950 font-mono font-bold text-[9px] rounded-full">
                    LIVE
                  </span>
                </div>
                <p className="text-[10px] text-sky-100">Super Admin Pharmacy Co-pilot</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {!isMinimized && (
                <button
                  type="button"
                  onClick={clearChat}
                  title="Clear Chat History"
                  className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? 'Expand' : 'Minimize'}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close AI Assistant"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Quick Prompt Chips */}
              <div className="px-3 py-2 bg-slate-50 dark:bg-[#090d16] border-b border-slate-200 dark:border-slate-800 flex gap-1.5 overflow-x-auto select-none no-scrollbar">
                {QUICK_PROMPTS.map((qp, i) => {
                  const Icon = qp.icon;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSendMessage(qp.prompt)}
                      disabled={loading}
                      className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-sky-500 hover:bg-sky-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-[10px] font-semibold whitespace-nowrap transition cursor-pointer disabled:opacity-50"
                    >
                      <Icon className="w-3 h-3 text-sky-500" />
                      <span>{qp.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Messages Area */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50 dark:bg-[#090d16]/50">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-sm ${
                        msg.sender === 'user'
                          ? 'bg-sky-600 text-white rounded-br-none shadow-sky-600/20'
                          : 'bg-white dark:bg-[#1e293b] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 rounded-bl-none'
                      }`}
                    >
                      {msg.sender === 'user' ? (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      ) : (
                        renderFormattedMarkdown(msg.text)
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 px-1 font-mono">
                      {msg.timestamp}
                    </span>
                  </div>
                ))}

                {loading && (
                  <div className="flex items-center gap-2 p-3 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-2xl max-w-[70%] rounded-bl-none shadow-sm animate-pulse">
                    <Bot className="w-4 h-4 text-sky-600 dark:text-sky-400 animate-spin" />
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Live data analyze ho raha hai...
                    </span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Bottom Input Box */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 bg-white dark:bg-[#0f172a] border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask anything (e.g. Paracetamol stock, today profit)..."
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#090d16] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
                <button
                  type="submit"
                  disabled={loading || !inputMessage.trim()}
                  className="p-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-md transition disabled:opacity-40 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
