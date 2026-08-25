'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  QrCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  PowerOff,
  Phone,
  User,
  Clock,
  Search,
  Check,
  CheckCheck,
  Smartphone,
  ShieldCheck,
  Smile,
  Paperclip,
  MoreVertical,
  ArrowLeft,
  Users,
  Building2,
  Receipt,
  FileText,
  Lock,
  Plus,
  CircleDot,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';

export default function WhatsAppHubPage() {
  const queryClient = useQueryClient();
  const { selectedBranchId, user } = useAuthStore();
  
  // UI Navigation & Chat State
  const [activeNavTab, setActiveNavTab] = useState<'chats' | 'customers' | 'suppliers' | 'logs'>('chats');
  const [filterChip, setFilterChip] = useState<'all' | 'unread' | 'customers' | 'suppliers'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [inputText, setInputText] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatName, setNewChatName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. WhatsApp Status Query (polls frequently when in pairing mode)
  const { data: statusData, isLoading: isStatusLoading } = useQuery({
    queryKey: ['whatsapp-status', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/whatsapp/status', {
        params: { branchId: selectedBranchId || undefined },
      });
      return res.data?.data || res.data || {};
    },
    refetchInterval: (query) => {
      const st = query.state.data?.status;
      return st === 'CONNECTING' || st === 'QR_READY' ? 1500 : 10000;
    },
  });

  // 2. Fetch Live Conversations
  const { data: conversationsData, isLoading: isConversationsLoading } = useQuery({
    queryKey: ['whatsapp-conversations', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/whatsapp/conversations', {
        params: { branchId: selectedBranchId || undefined },
      });
      return res.data?.data || res.data || [];
    },
    refetchInterval: 5000,
    enabled: statusData?.status === 'CONNECTED',
  });

  // 3. Fetch Selected Chat Messages
  const { data: chatMessagesData } = useQuery({
    queryKey: ['whatsapp-chat-messages', selectedBranchId, selectedChat?.phone],
    queryFn: async () => {
      if (!selectedChat?.phone) return [];
      const res = await apiClient.get('/whatsapp/conversation-messages', {
        params: {
          phone: selectedChat.phone,
          branchId: selectedBranchId || undefined,
        },
      });
      return res.data?.data || res.data || [];
    },
    refetchInterval: 3000,
    enabled: !!selectedChat?.phone && statusData?.status === 'CONNECTED',
  });

  // Connect Mutation
  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/whatsapp/connect', { branchId: selectedBranchId || undefined });
      return res.data?.data || res.data || {};
    },
    onSuccess: (data) => {
      if (data && data.status) {
        queryClient.setQueryData(['whatsapp-status', selectedBranchId], data);
      }
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to generate WhatsApp QR.');
    },
  });

  // Disconnect Mutation
  const disconnectMutation = useMutation({
    mutationFn: async () =>
      apiClient.post('/whatsapp/disconnect', { branchId: selectedBranchId || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
      setSelectedChat(null);
    },
  });

  // Send Message Mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (payload: { recipientPhone: string; recipientName?: string; content: string }) =>
      apiClient.post('/whatsapp/send-message', {
        ...payload,
        branchId: selectedBranchId || undefined,
      }),
    onSuccess: () => {
      setInputText('');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to dispatch WhatsApp message.');
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessagesData]);

  const isConnected = statusData?.status === 'CONNECTED';
  const isQrReady = statusData?.status === 'QR_READY' && statusData?.qrCode;
  const isConnecting = statusData?.status === 'CONNECTING' || connectMutation.isPending;

  const conversations: any[] = Array.isArray(conversationsData) ? conversationsData : [];
  const messages: any[] = Array.isArray(chatMessagesData) ? chatMessagesData : [];

  const filteredConversations = conversations.filter((c) => {
    if (filterChip === 'customers' && c.type !== 'CUSTOMER') return false;
    if (filterChip === 'suppliers' && c.type !== 'SUPPLIER') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.name?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.lastMessage?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Fetch Active Branches
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await apiClient.get('/branches');
      return res.data?.data || res.data || [];
    },
  });

  const branchList: any[] = Array.isArray(branchesData) ? branchesData : [];
  const currentBranch = branchList.find((b) => b.id === selectedBranchId) || branchList[0];

  return (
    <div className="flex h-screen bg-surface-page dark:bg-[#111b21] text-text-primary dark:text-[#e9edef] overflow-hidden font-sans select-none transition-colors duration-200">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        {/* MAIN WHATSAPP CONTAINER */}
        <div className="flex-1 flex overflow-hidden relative bg-slate-100 dark:bg-[#0c1317] transition-colors duration-200">
          {/* ========================================================= */}
          {/* STATE A: NOT CONNECTED -> OFFICIAL WHATSAPP WEB LOGIN UI  */}
          {/* ========================================================= */}
          {!isConnected ? (
            <div className="flex-1 overflow-y-auto flex flex-col items-center bg-surface-page dark:bg-[#111b21] p-4 sm:p-8 transition-colors duration-200">
              {/* WhatsApp Web Brand Top Header */}
              <div className="w-full max-w-4xl flex items-center justify-between py-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center text-white shadow-lg">
                    <MessageSquare className="w-6 h-6 fill-current" />
                  </div>
                  <span className="font-bold text-lg sm:text-xl tracking-tight text-text-primary dark:text-[#e9edef]">
                    WHATSAPP BUSINESS WEB
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#00a884] font-medium px-3 py-1 bg-surface-base dark:bg-[#202c33] border border-border-default dark:border-[#2a3942] rounded-xl">
                    🏢 {currentBranch ? `${currentBranch.name} (${currentBranch.code})` : 'Main Dispensary'}
                  </span>
                </div>
              </div>

              {/* Login Card */}
              <div className="w-full max-w-4xl bg-surface-base dark:bg-[#202c33] rounded-3xl p-6 sm:p-10 shadow-2xl border border-border-default dark:border-[#2a3942] flex flex-col lg:flex-row items-center justify-between gap-8 my-auto transition-colors duration-200">
                {/* Left Instructions */}
                <div className="flex-1 space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-text-primary dark:text-[#e9edef]">
                      To use WhatsApp on your computer:
                    </h2>
                    <p className="text-xs text-text-muted dark:text-[#8696a0]">
                      Link your medical store phone to send bills, payment confirmations &amp; due reminders automatically.
                    </p>
                  </div>

                  <ol className="space-y-4 text-sm text-text-secondary dark:text-[#d1d7db] font-normal leading-relaxed">
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-surface-raised dark:bg-[#2a3942] text-[#00a884] font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                        1
                      </span>
                      <span>
                        Open <strong>WhatsApp</strong> on your phone
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-surface-raised dark:bg-[#2a3942] text-[#00a884] font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                        2
                      </span>
                      <span>
                        Tap <strong>Menu (⋮)</strong> on Android or <strong>Settings (⚙️)</strong> on iPhone
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-surface-raised dark:bg-[#2a3942] text-[#00a884] font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                        3
                      </span>
                      <span>
                        Tap <strong>Linked devices</strong> and then <strong>Link a device</strong>
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-surface-raised dark:bg-[#2a3942] text-[#00a884] font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                        4
                      </span>
                      <span>
                        Point your phone to this screen to capture the QR code
                      </span>
                    </li>
                  </ol>

                  <div className="pt-2 flex items-center gap-4 text-xs text-[#00a884]">
                    <button
                      onClick={() => connectMutation.mutate()}
                      disabled={isConnecting}
                      className="hover:underline font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isConnecting ? 'animate-spin' : ''}`} />
                      {isConnecting ? 'Generating QR Code...' : 'Regenerate QR Code'}
                    </button>
                    <span className="text-text-muted dark:text-[#8696a0]">•</span>
                    <span className="text-text-muted dark:text-[#8696a0] flex items-center gap-1">
                      <Lock className="w-3 h-3 text-[#00a884]" /> End-to-end encrypted
                    </span>
                  </div>
                </div>

                {/* Right QR Box */}
                <div className="flex flex-col items-center justify-center p-6 bg-surface-raised dark:bg-[#111b21] rounded-2xl border border-border-default dark:border-[#2a3942] shadow-inner text-center min-w-[280px] transition-colors duration-200">
                  {isQrReady ? (
                    <div className="space-y-4">
                      <div className="p-3 bg-white rounded-2xl shadow-xl border-4 border-white inline-block relative group">
                        <img
                          src={statusData?.qrCode}
                          alt="WhatsApp Web QR Code"
                          className="w-56 h-56 rounded-xl object-contain"
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-[#00a884] animate-pulse flex items-center justify-center gap-1.5">
                          <CircleDot className="w-3.5 h-3.5" />
                          Ready to Scan
                        </p>
                        <p className="text-[11px] text-text-muted dark:text-[#8696a0]">
                          QR code refreshes automatically for security.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 space-y-4">
                      <div className="w-20 h-20 bg-surface-base dark:bg-[#202c33] rounded-full flex items-center justify-center mx-auto text-[#00a884] border border-border-default dark:border-[#2a3942]">
                        <QrCode className="w-10 h-10 opacity-80" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-text-primary dark:text-[#e9edef]">WhatsApp Pairing Standby</h4>
                        <p className="text-xs text-text-muted dark:text-[#8696a0] mt-1 max-w-[200px]">
                          Click below to start Baileys pairing and generate your store QR code.
                        </p>
                      </div>
                      <button
                        onClick={() => connectMutation.mutate()}
                        disabled={isConnecting}
                        className="px-6 py-2.5 bg-[#00a884] hover:bg-[#02906f] active:scale-95 text-white dark:text-[#111b21] font-bold rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-2 mx-auto cursor-pointer"
                      >
                        {isConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                        <span>{isConnecting ? 'Generating QR...' : 'Start WhatsApp Pairing'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom footer note */}
              <div className="mt-8 text-center text-xs text-text-muted dark:text-[#8696a0] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#00a884]" />
                Official Baileys WhatsApp Web Engine for Multi-Branch Medical ERP
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* STATE B: CONNECTED -> REAL WHATSAPP BUSINESS WEB INTERFACE */
            /* ========================================================= */
            <div className="flex-1 flex overflow-hidden w-full h-full">
              {/* 1. ULTRA-SLIM LEFT ICON STRIP */}
              <div className="w-14 bg-surface-base dark:bg-[#202c33] border-r border-border-default dark:border-[#2a3942] flex flex-col items-center justify-between py-3 flex-shrink-0 transition-colors duration-200">
                <div className="flex flex-col items-center gap-4">
                  <button
                    onClick={() => setActiveNavTab('chats')}
                    title="Chats"
                    className={`p-2.5 rounded-xl transition cursor-pointer relative ${
                      activeNavTab === 'chats' ? 'bg-emerald-50 dark:bg-[#374248] text-[#00a884]' : 'text-text-muted dark:text-[#aebac1] hover:bg-surface-raised dark:hover:bg-[#2a3942]'
                    }`}
                  >
                    <MessageSquare className="w-5 h-5" />
                    <span className="w-2 h-2 bg-[#00a884] rounded-full absolute top-2 right-2 ring-2 ring-surface-base dark:ring-[#202c33]" />
                  </button>

                  <button
                    onClick={() => {
                      setActiveNavTab('customers');
                      setFilterChip('customers');
                    }}
                    title="Customers"
                    className={`p-2.5 rounded-xl transition cursor-pointer ${
                      activeNavTab === 'customers' ? 'bg-emerald-50 dark:bg-[#374248] text-[#00a884]' : 'text-text-muted dark:text-[#aebac1] hover:bg-surface-raised dark:hover:bg-[#2a3942]'
                    }`}
                  >
                    <Users className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => {
                      setActiveNavTab('suppliers');
                      setFilterChip('suppliers');
                    }}
                    title="Suppliers & Distributors"
                    className={`p-2.5 rounded-xl transition cursor-pointer ${
                      activeNavTab === 'suppliers' ? 'bg-emerald-50 dark:bg-[#374248] text-[#00a884]' : 'text-text-muted dark:text-[#aebac1] hover:bg-surface-raised dark:hover:bg-[#2a3942]'
                    }`}
                  >
                    <Building2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <div
                    title={`Connected: ${statusData?.phoneNumber} (${statusData?.pushName})`}
                    className="w-8 h-8 rounded-full bg-[#00a884]/20 border border-[#00a884]/40 flex items-center justify-center text-[#00a884] text-xs font-bold font-mono"
                  >
                    WA
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('Disconnect WhatsApp session for this branch?')) {
                        disconnectMutation.mutate();
                      }
                    }}
                    title="Disconnect Session"
                    className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                  >
                    <PowerOff className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 2. CHATS SIDEBAR (340px) */}
              <div className="w-80 sm:w-96 bg-surface-page dark:bg-[#111b21] border-r border-border-default dark:border-[#2a3942] flex flex-col flex-shrink-0 transition-colors duration-200">
                {/* Header */}
                <div className="h-14 px-4 bg-surface-base dark:bg-[#202c33] flex items-center justify-between border-b border-border-default dark:border-[#2a3942] transition-colors duration-200">
                  <h3 className="font-bold text-lg text-text-primary dark:text-[#e9edef] tracking-tight">WhatsApp</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowNewChatModal(true)}
                      title="New Chat"
                      className="p-2 text-text-muted dark:text-[#aebac1] hover:bg-surface-raised dark:hover:bg-[#374248] rounded-full transition cursor-pointer"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
                        queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
                      }}
                      title="Refresh"
                      className="p-2 text-text-muted dark:text-[#aebac1] hover:bg-surface-raised dark:hover:bg-[#374248] rounded-full transition cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="p-2.5 bg-surface-page dark:bg-[#111b21] border-b border-border-default dark:border-[#222e35]">
                  <div className="relative bg-surface-raised dark:bg-[#202c33] border border-border-default dark:border-transparent rounded-xl flex items-center px-3 py-1.5">
                    <Search className="w-4 h-4 text-text-muted dark:text-[#8696a0] mr-2" />
                    <input
                      type="text"
                      placeholder="Search or start a new chat"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-transparent text-xs text-text-primary dark:text-[#d1d7db] placeholder-text-muted dark:placeholder-[#8696a0] focus:outline-none"
                    />
                  </div>

                  {/* Filter Chips */}
                  <div className="flex items-center gap-1.5 pt-2 overflow-x-auto text-[11px] font-medium no-scrollbar">
                    {(['all', 'unread', 'customers', 'suppliers'] as const).map((chip) => (
                      <button
                        key={chip}
                        onClick={() => setFilterChip(chip)}
                        className={`px-3 py-1 rounded-full capitalize transition whitespace-nowrap cursor-pointer ${
                          filterChip === chip
                            ? 'bg-[#00a884]/20 text-[#00a884] font-semibold border border-[#00a884]/40'
                            : 'bg-surface-raised dark:bg-[#202c33] text-text-muted dark:text-[#8696a0] hover:bg-surface-hover dark:hover:bg-[#374248]'
                        }`}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chat List */}
                <div className="flex-1 overflow-y-auto divide-y divide-border-default/40 dark:divide-[#222e35]/50">
                  {isConversationsLoading ? (
                    <div className="p-8 text-center text-xs text-text-muted dark:text-[#8696a0]">Loading conversations...</div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="p-8 text-center text-xs text-text-muted dark:text-[#8696a0] space-y-2">
                      <p>No conversations found.</p>
                      <button
                        onClick={() => setShowNewChatModal(true)}
                        className="px-3 py-1 bg-[#00a884] text-white dark:text-[#111b21] font-bold rounded-lg text-xs cursor-pointer"
                      >
                        + Start New Chat
                      </button>
                    </div>
                  ) : (
                    filteredConversations.map((c) => {
                      const isSelected = selectedChat?.phone === c.phone;
                      const initial = (c.name || 'C').charAt(0).toUpperCase();

                      return (
                        <div
                          key={c.phone}
                          onClick={() => setSelectedChat(c)}
                          className={`px-3.5 py-3 flex items-center gap-3 cursor-pointer transition relative ${
                            isSelected ? 'bg-emerald-50/70 dark:bg-[#2a3942]' : 'hover:bg-surface-hover dark:hover:bg-[#202c33]'
                          }`}
                        >
                          {/* Avatar */}
                          <div className="w-11 h-11 rounded-full bg-surface-raised dark:bg-[#374248] border border-border-default dark:border-[#41525d] text-text-primary dark:text-[#e9edef] flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {initial}
                          </div>

                          {/* Chat Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-text-primary dark:text-[#e9edef] truncate">{c.name}</span>
                              <span className="text-[10px] text-text-muted dark:text-[#8696a0] font-mono">
                                {new Date(c.lastMessageAt).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                })}
                              </span>
                            </div>

                            <div className="flex items-center justify-between mt-1 text-[11px] text-text-muted dark:text-[#8696a0]">
                              <span className="truncate max-w-[190px] flex items-center gap-1">
                                {c.lastStatus === 'SENT' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] flex-shrink-0" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 flex-shrink-0" />
                                )}
                                {c.lastMessage}
                              </span>

                              {c.type && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-raised dark:bg-[#202c33] border border-border-default dark:border-[#2a3942] text-text-muted dark:text-[#8696a0] uppercase font-bold">
                                  {c.type}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 3. RIGHT MAIN CHAT PANE */}
              {selectedChat ? (
                <div className="flex-1 flex flex-col bg-slate-50 dark:bg-[#0b141a] relative transition-colors duration-200">
                  {/* Chat Top Header */}
                  <div className="h-14 px-4 bg-surface-base dark:bg-[#202c33] flex items-center justify-between border-b border-border-default dark:border-[#2a3942] z-10 transition-colors duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-surface-raised dark:bg-[#374248] text-text-primary dark:text-[#e9edef] flex items-center justify-center font-bold text-sm">
                        {(selectedChat.name || 'C').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-text-primary dark:text-[#e9edef] leading-none">{selectedChat.name}</h4>
                        <span className="text-[11px] text-text-muted dark:text-[#8696a0] font-mono mt-1 block">
                          {selectedChat.phone}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-text-muted dark:text-[#aebac1]">
                      {selectedChat.customer?.id && (
                        <a
                          href={`/customers`}
                          className="px-2.5 py-1 rounded-lg bg-surface-raised dark:bg-[#374248] hover:bg-surface-hover dark:hover:bg-[#41525d] text-[11px] text-[#00a884] font-semibold flex items-center gap-1"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          View Customer
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Message Bubbles Container */}
                  <div
                    className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3"
                    style={{
                      backgroundImage: `radial-gradient(currentColor 1px, transparent 1px)`,
                      backgroundSize: '24px 24px',
                      opacity: 0.95,
                    }}
                  >
                    {/* Security Disclaimer Pill */}
                    <div className="text-center my-2">
                      <span className="px-3 py-1.5 rounded-lg bg-surface-base dark:bg-[#182229] border border-border-default dark:border-[#222e35] text-[11px] text-amber-700 dark:text-[#ffd279] inline-flex items-center gap-1.5 shadow-sm">
                        <Lock className="w-3 h-3 text-[#00a884]" />
                        Messages to this chat are routed through your store's authenticated WhatsApp session.
                      </span>
                    </div>

                    {messages.map((m: any) => {
                      const isOutgoing = m.status !== 'RECEIVED';
                      const timeStr = new Date(m.createdAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <div
                          key={m.id}
                          className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-md sm:max-w-lg rounded-2xl px-3.5 py-2.5 shadow-md relative text-xs leading-relaxed ${
                              isOutgoing
                                ? 'bg-emerald-600 text-white dark:bg-[#005c4b] dark:text-[#e9edef] rounded-tr-none'
                                : 'bg-white text-slate-900 border border-slate-200 dark:border-transparent dark:bg-[#202c33] dark:text-[#e9edef] rounded-tl-none'
                            }`}
                          >
                            {/* Message Type Tag */}
                            {m.messageType && m.messageType !== 'DIRECT_CHAT' && (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-black/10 dark:bg-black/20 text-white dark:text-[#8696a0] mb-1">
                                {m.messageType.replace('_', ' ')}
                              </span>
                            )}

                            {/* Message Text */}
                            <p className="whitespace-pre-line text-[12px]">{m.content}</p>

                            {/* Timestamp & Status */}
                            <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-80">
                              <span>{timeStr}</span>
                              {isOutgoing && (
                                m.status === 'SENT' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-sky-300 dark:text-[#53bdeb]" />
                                ) : m.status === 'FAILED' ? (
                                  <span className="text-rose-300" title={m.error}>❌</span>
                                ) : (
                                  <Clock className="w-3 h-3 opacity-70" />
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Bottom Input Composer */}
                  <div className="p-3 bg-surface-base dark:bg-[#202c33] border-t border-border-default dark:border-[#2a3942] space-y-2 transition-colors duration-200">
                    {/* Pharmacy Quick Response Chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] text-text-muted dark:text-[#8696a0] no-scrollbar">
                      <span className="font-bold text-text-primary dark:text-[#aebac1]">Quick:</span>
                      <button
                        type="button"
                        onClick={() =>
                          setInputText(`Namaste ${selectedChat.name}, your prescription order is packed and ready for billing at MedCare counter.`)
                        }
                        className="px-2.5 py-1 bg-surface-page dark:bg-[#111b21] hover:bg-surface-raised dark:hover:bg-[#374248] rounded-lg border border-border-default dark:border-[#2a3942] text-text-secondary dark:text-[#d1d7db] whitespace-nowrap cursor-pointer"
                      >
                        📦 Order Ready
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setInputText(`Namaste ${selectedChat.name}, please share your doctor's prescription so we can verify the medicines.`)
                        }
                        className="px-2.5 py-1 bg-surface-page dark:bg-[#111b21] hover:bg-surface-raised dark:hover:bg-[#374248] rounded-lg border border-border-default dark:border-[#2a3942] text-text-secondary dark:text-[#d1d7db] whitespace-nowrap cursor-pointer"
                      >
                        📄 Request Prescription
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setInputText(`Namaste ${selectedChat.name}, thank you for choosing MedCare Pharmacy! Wishing you a speedy recovery.`)
                        }
                        className="px-2.5 py-1 bg-surface-page dark:bg-[#111b21] hover:bg-surface-raised dark:hover:bg-[#374248] rounded-lg border border-border-default dark:border-[#2a3942] text-text-secondary dark:text-[#d1d7db] whitespace-nowrap cursor-pointer"
                      >
                        🙏 Thank You Note
                      </button>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!inputText.trim()) return;
                        sendMessageMutation.mutate({
                          recipientPhone: selectedChat.phone,
                          recipientName: selectedChat.name,
                          content: inputText.trim(),
                        });
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="text"
                        placeholder="Type a message..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        className="flex-1 bg-surface-page dark:bg-[#2a3942] text-xs text-text-primary dark:text-[#d1d7db] placeholder-text-muted dark:placeholder-[#8696a0] px-4 py-2.5 rounded-xl border border-border-default dark:border-transparent focus:outline-none focus:ring-1 focus:ring-[#00a884]"
                      />

                      <button
                        type="submit"
                        disabled={!inputText.trim() || sendMessageMutation.isPending}
                        className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#02906f] active:scale-95 text-white dark:text-[#111b21] flex items-center justify-center shadow-lg transition disabled:opacity-40 cursor-pointer flex-shrink-0"
                      >
                        <Send className="w-4 h-4 ml-0.5" />
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                /* WhatsApp Business Web Splash Screen */
                <div className="flex-1 flex flex-col items-center justify-center bg-surface-page dark:bg-[#222e35] p-8 text-center select-none border-b-8 border-[#00a884] transition-colors duration-200">
                  <div className="max-w-md space-y-4">
                    <div className="w-32 h-32 mx-auto rounded-full bg-emerald-50 dark:bg-[#111b21]/40 flex items-center justify-center border border-emerald-200 dark:border-[#2a3942]">
                      <MessageSquare className="w-16 h-16 text-[#00a884] opacity-80" />
                    </div>

                    <h2 className="text-2xl font-bold text-text-primary dark:text-[#e9edef] tracking-tight">
                      WhatsApp Business on Web
                    </h2>

                    <p className="text-xs text-text-muted dark:text-[#8696a0] leading-relaxed">
                      Select a customer or supplier chat on the left to review invoice receipts, prescription instructions, or start a new conversation.
                    </p>

                    <div className="pt-4 flex items-center justify-center gap-1.5 text-xs text-text-muted dark:text-[#8696a0]">
                      <Lock className="w-3.5 h-3.5 text-[#00a884]" /> End-to-end encrypted
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* New Chat Modal */}
        {showNewChatModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface-base dark:bg-[#202c33] border border-border-default dark:border-[#2a3942] rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-xs text-text-primary dark:text-[#e9edef] transition-colors duration-200">
              <div className="flex justify-between items-center pb-3 border-b border-border-default dark:border-[#2a3942]">
                <h3 className="font-bold text-sm text-text-primary dark:text-[#e9edef] flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#00a884]" />
                  Start New WhatsApp Chat
                </h3>
                <button onClick={() => setShowNewChatModal(false)} className="text-text-muted dark:text-[#8696a0] hover:text-text-primary dark:hover:text-white">
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-text-muted dark:text-[#8696a0] font-semibold mb-1">
                    Mobile Number (10 Digits or with +91) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={newChatPhone}
                    onChange={(e) => setNewChatPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-page dark:bg-[#111b21] border border-border-default dark:border-[#2a3942] rounded-xl text-xs text-text-primary dark:text-[#d1d7db] focus:outline-none focus:border-[#00a884] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-text-muted dark:text-[#8696a0] font-semibold mb-1">
                    Contact / Customer Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Sharma"
                    value={newChatName}
                    onChange={(e) => setNewChatName(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-page dark:bg-[#111b21] border border-border-default dark:border-[#2a3942] rounded-xl text-xs text-text-primary dark:text-[#d1d7db] focus:outline-none focus:border-[#00a884]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border-default dark:border-[#2a3942]">
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(false)}
                  className="px-4 py-2 bg-surface-raised dark:bg-[#111b21] hover:bg-surface-hover dark:hover:bg-[#374248] text-text-muted dark:text-[#8696a0] rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!newChatPhone.trim()) {
                      alert('Please enter a mobile number.');
                      return;
                    }
                    setSelectedChat({
                      phone: newChatPhone.trim(),
                      name: newChatName.trim() || newChatPhone.trim(),
                      type: 'DIRECT',
                    });
                    setShowNewChatModal(false);
                    setNewChatPhone('');
                    setNewChatName('');
                  }}
                  className="px-4 py-2 bg-[#00a884] hover:bg-[#02906f] text-white dark:text-[#111b21] font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Open Chat
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
