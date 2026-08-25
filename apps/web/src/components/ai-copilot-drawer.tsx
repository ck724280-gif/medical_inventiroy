'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Zap,
  TrendingUp,
  AlertCircle,
  Building2,
  Boxes,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { apiClient } from '../lib/api-client';
import { useAuthStore } from '../stores/auth-store';

interface Message {
  role: 'user' | 'model';
  text: string;
  toolsUsed?: string[];
  actionProposal?: {
    action: string;
    isRisky: boolean;
    previewText: string;
    suggestedPayload?: any;
    executed?: boolean;
  };
}

export function AiCopilotDrawer() {
  const pathname = usePathname();
  const { isAuthenticated, isSuperAdmin, user, selectedBranchId } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [executingAction, setExecutingAction] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: 'Namaste Super Admin Bhai! 🙏 Main aapka apna **AI Bhai & Business Advisor** hoon. Aapki pharmacy ke har branch ka live data mujhe pata hai. Sales badhani ho, inventory check karni ho ya life me koi advice chahiye ho — bejhijhak bolo bhai, har kadam par aapke saath hoon!',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Restrict to authenticated Super Admins and hide on /login
  if (!mounted || !isAuthenticated || pathname === '/login') {
    return null;
  }

  // Double check Super Admin role
  const isSuper = isSuperAdmin() || user?.roles?.some((r: any) => 
    (typeof r === 'string' ? r : r?.name)?.toUpperCase()?.includes('ADMIN') ||
    (typeof r === 'string' ? r : r?.name)?.toUpperCase()?.includes('OWNER')
  );

  if (!isSuper) {
    return null;
  }

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMessage: Message = { role: 'user', text: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    if (!queryText) setInput('');
    setLoading(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      const res = await apiClient.post('/ai-assistant/chat', {
        message: textToSend,
        history: historyPayload,
        branchId: selectedBranchId || undefined,
      });

      const responseText = res.data?.data?.response || res.data?.response || 'No response generated.';
      const toolsUsed = res.data?.data?.toolsUsed || res.data?.toolsUsed || [];
      const actionProposal = res.data?.data?.actionProposal || res.data?.actionProposal || null;

      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: responseText,
          toolsUsed,
          actionProposal,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: '⚠️ An error occurred while communicating with the AI Assistant.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAction = async (msgIndex: number, actionProposal: any) => {
    setExecutingAction(true);
    try {
      const res = await apiClient.post('/ai-assistant/action', {
        action: actionProposal.action,
        payload: actionProposal.suggestedPayload || {},
      });

      const resultData = res.data?.data || res.data;
      const successMessage = resultData.message || `Action ${actionProposal.action} executed successfully!`;

      // Mark proposal as executed
      setMessages((prev) => {
        const next = [...prev];
        if (next[msgIndex]?.actionProposal) {
          next[msgIndex].actionProposal!.executed = true;
        }
        return [
          ...next,
          {
            role: 'model',
            text: `✅ **Action Completed:** ${successMessage}`,
            toolsUsed: [actionProposal.action],
          },
        ];
      });
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Action execution failed.';
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: `❌ **Execution Error:** ${errorMsg}`,
        },
      ]);
    } finally {
      setExecutingAction(false);
    }
  };

  return (
    <>
      {/* Floating Action Sparkles Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full shadow-2xl hover:shadow-indigo-500/25 transition-all transform hover:scale-105 active:scale-95 group font-medium text-xs border border-white/20"
        title="Open AI Action Co-Pilot (Ctrl+J)"
      >
        <Sparkles className="w-4 h-4 animate-pulse text-yellow-300" />
        <span className="font-semibold tracking-wide">AI Co-Pilot</span>
        <span className="px-1.5 py-0.5 bg-black/30 rounded text-[10px] font-mono text-white/80">Ctrl+J</span>
      </button>

      {/* Interactive Drawer */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-surface-base border-l border-border-default shadow-2xl flex flex-col animate-slide-in-left">
          {/* Header */}
          <div className="p-4 border-b border-border-default flex items-center justify-between bg-surface-raised">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent-primary/10 text-accent-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-text-primary">Super Admin AI Co-Pilot</h3>
                <p className="text-[10px] text-text-muted">Grounded Real-Time Action Agent · Ctrl+J</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-text-muted hover:text-text-primary rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Prompts Bar */}
          <div className="p-2.5 bg-surface-base border-b border-border-default flex gap-2 overflow-x-auto text-[11px] no-scrollbar">
            <button
              onClick={() => handleSend('Aaj ki total sales aur profit kitna hua?')}
              className="px-2.5 py-1 bg-surface-raised hover:bg-surface-overlay border border-border-default rounded-full text-text-secondary whitespace-nowrap cursor-pointer"
            >
              📊 Today Sales &amp; Profit
            </button>
            <button
              onClick={() => handleSend('Show expiring medicines in next 60 days')}
              className="px-2.5 py-1 bg-surface-raised hover:bg-surface-overlay border border-border-default rounded-full text-text-secondary whitespace-nowrap cursor-pointer"
            >
              ⚠️ Expiry Alerts
            </button>
            <button
              onClick={() => handleSend('Total inventory valuation across all branches')}
              className="px-2.5 py-1 bg-surface-raised hover:bg-surface-overlay border border-border-default rounded-full text-text-secondary whitespace-nowrap cursor-pointer"
            >
              📦 Stock Valuation
            </button>
            <button
              onClick={() => handleSend('System health aur latency check karo')}
              className="px-2.5 py-1 bg-surface-raised hover:bg-surface-overlay border border-border-default rounded-full text-text-secondary whitespace-nowrap cursor-pointer"
            >
              ⚡ System Health
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'model' && (
                  <div className="w-6 h-6 rounded-full bg-accent-primary text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 space-y-2 leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-accent-primary text-white font-medium'
                      : 'bg-surface-raised border border-border-default text-text-primary'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>

                  {/* Action Proposal Preview Card */}
                  {msg.actionProposal && !msg.actionProposal.executed && (
                    <div className="p-3 bg-surface-base border border-amber-300 dark:border-amber-700/60 rounded-xl space-y-2 text-xs text-text-primary mt-2 shadow-sm">
                      <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                        <ShieldAlert className="w-4 h-4" />
                        <span>Action Preview &amp; Confirmation Required</span>
                      </div>
                      <p className="text-[11px] text-text-secondary">
                        {msg.actionProposal.previewText}
                      </p>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleExecuteAction(i, msg.actionProposal)}
                          disabled={executingAction}
                          className="px-3 py-1.5 bg-accent-primary hover:bg-accent-hover text-white rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
                        >
                          {executingAction ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                          Execute Action
                        </button>
                      </div>
                    </div>
                  )}

                  {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                    <div className="pt-2 border-t border-border-default/50 flex flex-wrap gap-1">
                      {msg.toolsUsed.map((tool, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 bg-accent-primary/10 text-accent-primary text-[9px] font-mono rounded"
                        >
                          ⚡ {tool}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-surface-raised border border-border-default flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-text-muted" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-text-muted text-xs p-2">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-accent-primary" />
                <span>AI is analyzing ERP database...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-3 border-t border-border-default bg-surface-raised flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask questions or command actions (Hindi, English, Hinglish)..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              className="flex-1 px-3 py-2 bg-surface-base border border-border-default rounded-xl text-xs text-text-primary focus:outline-none focus:border-accent-primary"
            />
            <Button
              variant="primary"
              size="sm"
              disabled={!input.trim() || loading}
              onClick={() => handleSend()}
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
