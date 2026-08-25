'use client';

import React, { useState } from 'react';
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
  FileText,
  Clock,
  Search,
  Filter,
  Building2,
  Sparkles,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { PageHeader } from '../../components/ui/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';

export default function WhatsAppHubPage() {
  const queryClient = useQueryClient();
  const { selectedBranchId, user } = useAuthStore();
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Quick Direct Message Form State
  const [directMsgModal, setDirectMsgModal] = useState(false);
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [messageContent, setMessageContent] = useState('');

  // WhatsApp Status Query (polling every 5s while connecting)
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
      return st === 'CONNECTING' || st === 'QR_READY' ? 3000 : 15000;
    },
  });

  // Message Logs Query
  const { data: logsData, isLoading: isLogsLoading } = useQuery({
    queryKey: ['whatsapp-logs', selectedBranchId, filterType, filterStatus, searchTerm],
    queryFn: async () => {
      const res = await apiClient.get('/whatsapp/logs', {
        params: {
          branchId: selectedBranchId || undefined,
          messageType: filterType || undefined,
          status: filterStatus || undefined,
          search: searchTerm || undefined,
          limit: 100,
        },
      });
      return res.data?.data || res.data?.items || res.data || [];
    },
  });

  // Connect Mutation
  const connectMutation = useMutation({
    mutationFn: async () =>
      apiClient.post('/whatsapp/connect', { branchId: selectedBranchId || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
    },
  });

  // Disconnect Mutation
  const disconnectMutation = useMutation({
    mutationFn: async () =>
      apiClient.post('/whatsapp/disconnect', { branchId: selectedBranchId || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
    },
  });

  // Send Direct Message Mutation
  const sendMsgMutation = useMutation({
    mutationFn: async (payload: { recipientPhone: string; recipientName?: string; content: string }) =>
      apiClient.post('/whatsapp/send-message', {
        ...payload,
        branchId: selectedBranchId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-logs'] });
      setDirectMsgModal(false);
      setRecipientPhone('');
      setRecipientName('');
      setMessageContent('');
      alert('WhatsApp message dispatched successfully!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to send WhatsApp message.');
    },
  });

  const isConnected = statusData?.status === 'CONNECTED';
  const isQrReady = statusData?.status === 'QR_READY' && statusData?.qrCode;
  const isConnecting = statusData?.status === 'CONNECTING';
  const logs: any[] = Array.isArray(logsData) ? logsData : [];

  return (
    <div className="flex h-screen bg-surface-page text-text-primary overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <PageHeader
            title="WhatsApp Communication & QR Hub"
            description="Link your store WhatsApp via QR scan to send automated Bill PDFs, Payment Confirmations, Due Reminders, and Direct Messages to Customers & Staff."
            badge={
              isConnected ? (
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold flex items-center gap-1.5 animate-pulse">
                  ● Connected ({statusData?.phoneNumber || 'Active'})
                </span>
              ) : (
                <span className="px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-full text-xs font-bold flex items-center gap-1.5">
                  ○ Disconnected
                </span>
              )
            }
            actions={
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setDirectMsgModal(true)}
                  disabled={!isConnected}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  Quick Direct Message
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
                    queryClient.invalidateQueries({ queryKey: ['whatsapp-logs'] });
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  Refresh
                </Button>
              </div>
            }
          />

          {/* Connection Status & QR Code Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Session Details */}
            <Card className="lg:col-span-2 bg-surface-base border-border-default shadow-sm">
              <CardHeader className="pb-3 border-b border-border-default">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Branch WhatsApp Session Status
                  </span>
                  <Badge variant={isConnected ? 'success' : 'warning'}>
                    {statusData?.status || 'DISCONNECTED'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {isConnected ? (
                  <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        WhatsApp Linked & Ready for Automated Messaging
                      </div>
                      <p className="text-xs text-text-secondary">
                        Phone: <strong className="text-text-primary font-mono">{statusData?.phoneNumber}</strong> ({statusData?.pushName || 'Store Account'})
                      </p>
                      <p className="text-[11px] text-text-muted">
                        All POS bills, customer payment confirmations, and due reminders will automatically be dispatched through this number.
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to disconnect WhatsApp from this branch?')) {
                          disconnectMutation.mutate();
                        }
                      }}
                      disabled={disconnectMutation.isPending}
                      className="text-red-600 border-red-500/30 hover:bg-red-500/10 flex-shrink-0"
                    >
                      <PowerOff className="w-4 h-4 mr-1.5" />
                      Disconnect WhatsApp
                    </Button>
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-sm">
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                        WhatsApp Not Connected for This Branch
                      </div>
                      <p className="text-xs text-text-secondary">
                        Scan the QR code with your mobile WhatsApp (Linked Devices) to activate direct customer billing & reminders.
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => connectMutation.mutate()}
                      disabled={connectMutation.isPending || isConnecting}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex-shrink-0 shadow-sm"
                    >
                      <QrCode className="w-4 h-4 mr-1.5" />
                      {isConnecting ? 'Generating QR...' : 'Generate QR Code'}
                    </Button>
                  </div>
                )}

                {/* Instructions Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 bg-surface-raised rounded-xl border border-border-default text-xs space-y-1">
                    <span className="font-bold text-text-primary block flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-accent-primary" />
                      1. Open WhatsApp
                    </span>
                    <span className="text-[11px] text-text-muted">
                      Open WhatsApp on your mobile phone and tap Settings / 3-dots.
                    </span>
                  </div>
                  <div className="p-3 bg-surface-raised rounded-xl border border-border-default text-xs space-y-1">
                    <span className="font-bold text-text-primary block flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-accent-primary" />
                      2. Linked Devices
                    </span>
                    <span className="text-[11px] text-text-muted">
                      Tap <strong>Linked Devices</strong> → <strong>Link a Device</strong>.
                    </span>
                  </div>
                  <div className="p-3 bg-surface-raised rounded-xl border border-border-default text-xs space-y-1">
                    <span className="font-bold text-text-primary block flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      3. Scan On-Screen QR
                    </span>
                    <span className="text-[11px] text-text-muted">
                      Point your phone camera to the QR code on the right side.
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right Col: QR Code Display Card */}
            <Card className="bg-surface-base border-border-default shadow-sm flex flex-col justify-center items-center p-6 text-center">
              {isConnected ? (
                <div className="space-y-3 py-6">
                  <div className="w-20 h-20 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h4 className="font-bold text-sm text-text-primary">Device Connected</h4>
                  <p className="text-xs text-text-muted font-mono">{statusData?.phoneNumber}</p>
                </div>
              ) : isQrReady ? (
                <div className="space-y-3">
                  <div className="p-2 bg-white rounded-2xl shadow-md border border-slate-200 inline-block">
                    <img
                      src={statusData?.qrCode}
                      alt="WhatsApp Web QR Code"
                      className="w-48 h-48 rounded-xl object-contain"
                    />
                  </div>
                  <p className="text-xs font-semibold text-text-secondary animate-pulse">
                    Scan with your mobile WhatsApp
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => connectMutation.mutate()}
                    className="text-xs"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> Refresh QR
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 py-8 text-center">
                  <div className="w-16 h-16 bg-surface-raised text-text-muted rounded-full flex items-center justify-center mx-auto border border-border-default">
                    <QrCode className="w-8 h-8 opacity-60" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-text-secondary">QR Code Standby</h4>
                    <p className="text-[11px] text-text-muted mt-0.5">Click below to generate a fresh QR code.</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => connectMutation.mutate()}
                    disabled={connectMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
                  >
                    Start WhatsApp Pairing
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* WhatsApp Message Logs & Audit Trail */}
          <Card className="bg-surface-base border-border-default shadow-sm">
            <CardHeader className="pb-3 border-b border-border-default flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent-primary" />
                Outgoing Message History & Audit Trail ({logs.length})
              </CardTitle>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search phone, customer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-surface-page border border-border-default rounded-xl text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                  />
                </div>

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-2.5 py-1.5 bg-surface-page border border-border-default rounded-xl text-xs font-semibold text-text-primary focus:outline-none"
                >
                  <option value="">All Message Types</option>
                  <option value="BILL_INVOICE">Bill Invoices</option>
                  <option value="DUE_REMINDER">Due Reminders</option>
                  <option value="PAYMENT_CONFIRMATION">Payment Receipts</option>
                  <option value="DIRECT_CHAT">Direct Chats</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-2.5 py-1.5 bg-surface-page border border-border-default rounded-xl text-xs font-semibold text-text-primary focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="SENT">Sent</option>
                  <option value="FAILED">Failed</option>
                  <option value="QUEUED">Queued</option>
                </select>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {isLogsLoading ? (
                <div className="p-8 text-center text-xs text-text-muted">Loading message records...</div>
              ) : logs.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <MessageCircle className="w-8 h-8 text-text-muted mx-auto opacity-50" />
                  <p className="text-xs font-semibold text-text-secondary">No WhatsApp messages dispatched yet.</p>
                  <p className="text-[11px] text-text-muted">
                    Messages sent from POS counter, Customers directory, and due reminders will show here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-surface-raised text-text-muted font-semibold border-b border-border-default text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-4">Date & Time</th>
                        <th className="py-2.5 px-4">Recipient</th>
                        <th className="py-2.5 px-4">Type</th>
                        <th className="py-2.5 px-4">Message Content Preview</th>
                        <th className="py-2.5 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default bg-surface-base">
                      {logs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-surface-raised/50 transition">
                          <td className="py-3 px-4 text-text-muted font-mono text-[11px] whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-text-primary block">{log.recipientName || 'Customer'}</span>
                            <span className="font-mono text-[11px] text-text-secondary">{log.recipientPhone}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-surface-raised border border-border-default text-text-secondary">
                              {log.messageType?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate text-text-secondary" title={log.content}>
                            {log.content?.substring(0, 70)}...
                          </td>
                          <td className="py-3 px-4 text-center">
                            {log.status === 'SENT' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                ✅ Sent
                              </span>
                            ) : log.status === 'FAILED' ? (
                              <span
                                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 cursor-pointer"
                                title={log.error}
                              >
                                ❌ Failed
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                ⏳ Queued
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Direct Message Modal */}
          {directMsgModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-surface-base rounded-2xl shadow-2xl border border-border-default max-w-md w-full p-6 space-y-4 text-xs animate-scale-in">
                <div className="flex items-center justify-between pb-3 border-b border-border-default">
                  <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Send Direct WhatsApp Message
                  </h3>
                  <button
                    onClick={() => setDirectMsgModal(false)}
                    className="text-text-muted hover:text-text-primary"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="font-semibold text-text-secondary block mb-1">
                      Recipient Mobile Number (with country code or 10 digits)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 9876543210 or +919876543210"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-xs text-text-primary focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-text-secondary block mb-1">
                      Recipient Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Customer or Staff Name"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-xs text-text-primary focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-text-secondary block mb-1">
                      Message Text
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Type your message here..."
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-xs text-text-primary focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-border-default flex justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setDirectMsgModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!recipientPhone.trim() || !messageContent.trim()) {
                        alert('Phone number and message content are required.');
                        return;
                      }
                      sendMsgMutation.mutate({
                        recipientPhone,
                        recipientName,
                        content: messageContent,
                      });
                    }}
                    disabled={sendMsgMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {sendMsgMutation.isPending ? 'Sending...' : 'Send WhatsApp'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
