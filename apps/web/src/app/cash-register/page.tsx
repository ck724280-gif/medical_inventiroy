'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wallet,
  DollarSign,
  Lock,
  Unlock,
  CheckCircle,
  AlertCircle,
  Receipt,
  FileText,
  Clock,
  Printer,
  TrendingUp,
  Sun,
  Sunset,
  Moon,
  Users,
  Layers,
  ArrowRightLeft,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { PageHeader } from '../../components/ui/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { apiClient } from '../../lib/api-client';
import { formatCurrency, formatDate } from '@medical-inventory/shared-utils';
import { useAuthStore } from '../../stores/auth-store';
import { extractDataArray } from '../../lib/utils';

export default function CashRegisterPage() {
  const queryClient = useQueryClient();
  const { user, selectedBranchId } = useAuthStore();
  const activeBranchId = selectedBranchId || user?.branches?.[0]?.id || '';

  // Store Register States
  const [registerOpeningFloat, setRegisterOpeningFloat] = useState<number | string>('500');
  const [registerClosingCount, setRegisterClosingCount] = useState<number | string>('');
  const [registerNotes, setRegisterNotes] = useState('');
  const [isRegisterCloseModalOpen, setIsRegisterCloseModalOpen] = useState(false);

  // Staff Shift States
  const [shiftType, setShiftType] = useState<'DAY' | 'EVENING' | 'NIGHT' | 'GENERAL'>('DAY');
  const [shiftOpeningCash, setShiftOpeningCash] = useState<number | string>('500');
  const [shiftClosingCash, setShiftClosingCash] = useState<number | string>('');
  const [shiftNotes, setShiftNotes] = useState('');
  const [isShiftCloseModalOpen, setIsShiftCloseModalOpen] = useState(false);
  const [isStartShiftModalOpen, setIsStartShiftModalOpen] = useState(false);

  // 1. Query Store Master Cash Register Session
  const { data: registerData, isLoading: isRegisterLoading } = useQuery({
    queryKey: ['store-cash-register', activeBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/cash-registers/register/current', {
        params: { branchId: activeBranchId || undefined },
      });
      return res.data?.data || res.data;
    },
  });

  // 2. Query Staff Active Shift
  const { data: shiftData, isLoading: isShiftLoading } = useQuery({
    queryKey: ['staff-current-shift', activeBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/cash-registers/shift/current', {
        params: { branchId: activeBranchId || undefined },
      });
      return res.data?.data || res.data;
    },
  });

  // 3. Query All Shifts History for this Branch
  const { data: branchShiftsData } = useQuery({
    queryKey: ['branch-shifts-history', activeBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/cash-registers/shifts', {
        params: { branchId: activeBranchId || undefined },
      });
      return res.data?.data || res.data;
    },
  });

  const isRegisterOpen = Boolean(registerData?.isOpen && registerData?.register);
  const registerSession = registerData?.register;
  const registerLiveTotals = registerSession?.liveTotals;

  const currentShift = shiftData?.id ? shiftData : (shiftData?.shift || null);
  const isShiftOpen = Boolean(currentShift && currentShift.status === 'OPEN');
  const shiftLiveTotals = currentShift?.liveTotals;

  const allShiftsList = extractDataArray(branchShiftsData);

  // Mutations for Store Cash Register
  const openRegisterMutation = useMutation({
    mutationFn: async (openingFloat: number) => {
      const res = await apiClient.post('/cash-registers/register/open', {
        branchId: activeBranchId,
        openingFloat,
        notes: registerNotes || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-cash-register'] });
      queryClient.invalidateQueries({ queryKey: ['staff-current-shift'] });
      queryClient.invalidateQueries({ queryKey: ['pos-current-shift'] });
      alert('Store Cash Register opened successfully! Staff can now start Day, Evening, and Night shifts.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to open store cash register');
    },
  });

  const closeRegisterMutation = useMutation({
    mutationFn: async ({ closingCash, notes }: { closingCash: number; notes: string }) => {
      const res = await apiClient.post(`/cash-registers/register/${registerSession?.id}/close`, {
        closingCash,
        notes,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-cash-register'] });
      queryClient.invalidateQueries({ queryKey: ['staff-current-shift'] });
      queryClient.invalidateQueries({ queryKey: ['branch-shifts-history'] });
      queryClient.invalidateQueries({ queryKey: ['pos-current-shift'] });
      setIsRegisterCloseModalOpen(false);
      alert('Store Cash Register CLOSED. All active shifts finalized. End of Day Z-Report generated.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to close cash register');
    },
  });

  // Mutations for Staff Shifts
  const openShiftMutation = useMutation({
    mutationFn: async ({ openingCash, shiftType }: { openingCash: number; shiftType: string }) => {
      const res = await apiClient.post('/cash-registers/shift/open', {
        branchId: activeBranchId,
        openingCash,
        shiftType,
        notes: shiftNotes || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-current-shift'] });
      queryClient.invalidateQueries({ queryKey: ['branch-shifts-history'] });
      queryClient.invalidateQueries({ queryKey: ['pos-current-shift'] });
      setIsStartShiftModalOpen(false);
      alert(`${shiftType} Shift started successfully! POS billing is active.`);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to start shift');
    },
  });

  const closeShiftMutation = useMutation({
    mutationFn: async ({ closingCash, notes }: { closingCash: number; notes: string }) => {
      const res = await apiClient.post(`/cash-registers/shift/${currentShift?.id}/close`, {
        closingCash,
        notes,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-current-shift'] });
      queryClient.invalidateQueries({ queryKey: ['branch-shifts-history'] });
      queryClient.invalidateQueries({ queryKey: ['store-cash-register'] });
      queryClient.invalidateQueries({ queryKey: ['pos-current-shift'] });
      setIsShiftCloseModalOpen(false);
      alert('Staff shift ended & reconciled! Store Cash Register remains OPEN for the next shift staff.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to close shift');
    },
  });

  const getShiftIcon = (type: string) => {
    switch (type) {
      case 'DAY':
        return <Sun className="w-4 h-4 text-amber-500" />;
      case 'EVENING':
        return <Sunset className="w-4 h-4 text-orange-500" />;
      case 'NIGHT':
        return <Moon className="w-4 h-4 text-indigo-500" />;
      default:
        return <Clock className="w-4 h-4 text-accent-primary" />;
    }
  };

  return (
    <div className="flex h-screen bg-surface-page text-text-primary overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <PageHeader
            title="Store Cash Register & Multi-Staff Shifts"
            description="Manage the store's master daily cash register, Day / Evening / Night cashier shifts, and cash drawer handovers."
            badge={
              isRegisterOpen ? (
                <div className="flex items-center gap-2">
                  <Badge variant="success">Store Register OPEN</Badge>
                  {isShiftOpen ? (
                    <Badge variant="info">My Shift: {currentShift?.shiftType || 'ACTIVE'}</Badge>
                  ) : (
                    <Badge variant="warning">My Shift: OFFLINE</Badge>
                  )}
                </div>
              ) : (
                <Badge variant="error">Store Register CLOSED</Badge>
              )
            }
            actions={
              <div className="flex items-center gap-2">
                {isRegisterOpen && (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => window.print()}>
                      <Printer className="w-4 h-4 mr-1.5" />
                      X-Report
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        const expected = Number(
                          registerLiveTotals?.expectedDrawerCash ??
                            ((registerSession?.openingFloat || 0) + (registerLiveTotals?.cashSales || 0))
                        );
                        setRegisterClosingCount(expected > 0 ? expected.toFixed(2) : (registerSession?.openingFloat || 0).toFixed(2));
                        setIsRegisterCloseModalOpen(true);
                      }}
                    >
                      <Lock className="w-4 h-4 mr-1.5" />
                      Close Store Register (End of Day)
                    </Button>
                  </>
                )}
              </div>
            }
          />

          {/* ========================================================================= */}
          {/* 1. STORE CASH REGISTER MASTER STATUS SECTION */}
          {/* ========================================================================= */}
          {!isRegisterOpen ? (
            <Card className="max-w-xl mx-auto bg-surface-base border-amber-500/30 dark:border-amber-500/20 shadow-xl p-6 text-center space-y-5">
              <div className="w-14 h-14 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <Lock className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-primary">Store Cash Register is Currently CLOSED</h3>
                <p className="text-xs text-text-muted mt-1.5 max-w-md mx-auto">
                  Staff cannot activate Day, Evening, or Night shifts while the store cash register is closed.
                  Open the register to unlock shift sessions and POS billing.
                </p>
              </div>

              <div className="text-left bg-surface-page p-4 rounded-xl border border-border-default space-y-3">
                <div>
                  <label className="text-xs font-bold text-text-primary block mb-1">
                    Morning Starting Cash Float (₹) *
                  </label>
                  <input
                    type="number"
                    value={registerOpeningFloat}
                    onChange={(e) => setRegisterOpeningFloat(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    placeholder="500.00"
                    className="w-full px-3 py-2 bg-surface-base border border-border-default rounded-lg text-sm font-bold text-text-primary focus:outline-none focus:border-accent-primary font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">
                    Opening Notes / Cashier Remark (Optional)
                  </label>
                  <input
                    type="text"
                    value={registerNotes}
                    onChange={(e) => setRegisterNotes(e.target.value)}
                    placeholder="e.g., Morning drawer verified with 500 float"
                    className="w-full px-3 py-2 bg-surface-base border border-border-default rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                  />
                </div>
              </div>

              <Button
                variant="primary"
                className="w-full py-2.5 font-bold text-sm shadow-md"
                onClick={() => openRegisterMutation.mutate(Number(registerOpeningFloat) || 0)}
                disabled={openRegisterMutation.isPending}
              >
                <Unlock className="w-4 h-4 mr-2" />
                {openRegisterMutation.isPending ? 'Opening Store Register...' : 'Open Store Cash Register'}
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Register Active KPI Banner */}
              <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-4 rounded-2xl border border-emerald-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-md">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-text-primary">Store Master Register is ACTIVE</h3>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-500/30">
                        OPEN
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">
                      Opened at {formatDate(registerSession?.openedAt)} by {registerSession?.openedByUser?.firstName} {registerSession?.openedByUser?.lastName || ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-text-muted block text-[10px]">Opening Float</span>
                    <span className="font-bold text-sm text-text-primary font-mono">
                      {formatCurrency(registerSession?.openingFloat || 0)}
                    </span>
                  </div>
                  <div className="border-l border-border-default pl-4">
                    <span className="text-text-muted block text-[10px]">Live Total Sales</span>
                    <span className="font-bold text-sm text-status-success font-mono">
                      {formatCurrency(registerLiveTotals?.totalSalesAmount || 0)}
                    </span>
                  </div>
                  <div className="border-l border-border-default pl-4">
                    <span className="text-text-muted block text-[10px]">Expected In Drawer</span>
                    <span className="font-bold text-sm text-accent-primary font-mono">
                      {formatCurrency(registerLiveTotals?.expectedDrawerCash || registerSession?.openingFloat || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* KPI Cards Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <Card className="bg-surface-base border-border-default">
                  <CardContent className="pt-4 space-y-1">
                    <span className="text-[11px] font-semibold text-text-muted">Opening Float</span>
                    <div className="text-base font-bold text-text-primary font-mono">
                      {formatCurrency(registerSession?.openingFloat || 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-surface-base border-border-default">
                  <CardContent className="pt-4 space-y-1">
                    <span className="text-[11px] font-semibold text-text-muted">Cash Sales</span>
                    <div className="text-base font-bold text-status-success font-mono">
                      {formatCurrency(registerLiveTotals?.cashSales || 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-surface-base border-border-default">
                  <CardContent className="pt-4 space-y-1">
                    <span className="text-[11px] font-semibold text-text-muted">UPI Sales</span>
                    <div className="text-base font-bold text-blue-500 font-mono">
                      {formatCurrency(registerLiveTotals?.upiSales || 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-surface-base border-border-default">
                  <CardContent className="pt-4 space-y-1">
                    <span className="text-[11px] font-semibold text-text-muted">Card / Credit</span>
                    <div className="text-base font-bold text-purple-500 font-mono">
                      {formatCurrency((registerLiveTotals?.cardSales || 0) + (registerLiveTotals?.creditSales || 0))}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-surface-base border-border-default">
                  <CardContent className="pt-4 space-y-1">
                    <span className="text-[11px] font-semibold text-text-muted">Cash Expenses</span>
                    <div className="text-base font-bold text-status-error font-mono">
                      -{formatCurrency(registerLiveTotals?.cashExpenses || 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-surface-base border-border-default">
                  <CardContent className="pt-4 space-y-1">
                    <span className="text-[11px] font-semibold text-text-muted">Expected Cash</span>
                    <div className="text-base font-bold text-status-warning font-mono">
                      {formatCurrency(registerLiveTotals?.expectedDrawerCash || registerSession?.openingFloat || 0)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ========================================================================= */}
              {/* 2. STAFF CASHIER SHIFTS SECTION (Day / Evening / Night) */}
              {/* ========================================================================= */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Card: Current Staff Active Shift */}
                <Card className="bg-surface-base border-border-default shadow-sm lg:col-span-1">
                  <CardHeader className="border-b border-border-default pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-accent-primary" />
                        My Active Staff Shift
                      </span>
                      {isShiftOpen ? (
                        <Badge variant="success">Shift ACTIVE</Badge>
                      ) : (
                        <Badge variant="outline">Shift OFFLINE</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4 text-xs">
                    {isShiftOpen ? (
                      <div className="space-y-4">
                        <div className="p-3 bg-surface-page rounded-xl border border-border-default space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-text-primary flex items-center gap-1.5">
                              {getShiftIcon(currentShift.shiftType)}
                              {currentShift.shiftType} Shift
                            </span>
                            <span className="text-[10px] text-text-muted">
                              Started {formatDate(currentShift.openedAt)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-default font-mono">
                            <div>
                              <span className="text-[10px] text-text-muted block">Shift Cash Float</span>
                              <span className="font-bold text-text-primary">
                                {formatCurrency(currentShift.openingCash || 0)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-text-muted block">Shift Cash Sales</span>
                              <span className="font-bold text-status-success">
                                {formatCurrency(shiftLiveTotals?.cashSales || 0)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-text-muted block">Shift Digital Sales</span>
                              <span className="font-bold text-blue-500">
                                {formatCurrency((shiftLiveTotals?.upiSales || 0) + (shiftLiveTotals?.cardSales || 0))}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-text-muted block">Expected Shift Cash</span>
                              <span className="font-bold text-status-warning">
                                {formatCurrency(shiftLiveTotals?.expectedDrawerCash || currentShift.openingCash || 0)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-xl text-[11px] flex items-start gap-2 border border-blue-200 dark:border-blue-800">
                          <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>
                            Ending your shift reconciles your drawer and hands over to the next shift. 
                            <strong> Store Register remains OPEN.</strong>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link href="/pos" className="flex-1">
                            <Button variant="primary" size="sm" className="w-full">
                              Go to POS Billing
                            </Button>
                          </Link>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              const expected = Number(shiftLiveTotals?.expectedDrawerCash || currentShift.openingCash || 0);
                              setShiftClosingCash(expected > 0 ? expected.toFixed(2) : (currentShift.openingCash || 0).toFixed(2));
                              setIsShiftCloseModalOpen(true);
                            }}
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5 mr-1" />
                            End Shift / Handover
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 space-y-3">
                        <div className="w-10 h-10 bg-surface-page rounded-full flex items-center justify-center mx-auto text-text-muted border border-border-default">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-text-primary">You are not in an active shift</p>
                          <p className="text-[11px] text-text-muted mt-0.5">
                            Select your shift schedule to begin cashier billing session.
                          </p>
                        </div>

                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full"
                          onClick={() => setIsStartShiftModalOpen(true)}
                        >
                          <Unlock className="w-3.5 h-3.5 mr-1.5" />
                          Start Staff Shift (Day/Evening/Night)
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Right Card: Today's Shifts & Handover History */}
                <Card className="bg-surface-base border-border-default shadow-sm lg:col-span-2">
                  <CardHeader className="border-b border-border-default pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Layers className="w-4 h-4 text-accent-primary" />
                      Today's Staff Shifts &amp; Drawer Handover History
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-surface-page text-text-muted uppercase text-[10px] font-semibold border-b border-border-default">
                        <tr>
                          <th className="py-2.5 px-3">Staff / Cashier</th>
                          <th className="py-2.5 px-3">Shift Type</th>
                          <th className="py-2.5 px-3">Time Period</th>
                          <th className="py-2.5 px-3">Opening</th>
                          <th className="py-2.5 px-3">Cash Sales</th>
                          <th className="py-2.5 px-3">Closed / Counted</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-default font-mono">
                        {allShiftsList.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-6 text-center text-text-muted font-sans text-xs">
                              No staff shifts recorded yet for this branch.
                            </td>
                          </tr>
                        ) : (
                          allShiftsList.map((s: any) => (
                            <tr key={s.id} className="hover:bg-surface-raised transition font-sans">
                              <td className="py-2.5 px-3 font-semibold text-text-primary">
                                {s.user?.firstName} {s.user?.lastName || ''}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="inline-flex items-center gap-1 font-semibold text-text-primary text-[11px]">
                                  {getShiftIcon(s.shiftType)}
                                  {s.shiftType || 'DAY'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-[10px] text-text-muted">
                                <div>In: {formatDate(s.openedAt)}</div>
                                {s.closedAt && <div>Out: {formatDate(s.closedAt)}</div>}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-medium">
                                {formatCurrency(s.openingCash || 0)}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-status-success font-medium">
                                {formatCurrency(s.totalCashSales || 0)}
                              </td>
                              <td className="py-2.5 px-3 font-mono">
                                {s.closingCash !== null && s.closingCash !== undefined
                                  ? formatCurrency(s.closingCash)
                                  : '— (Active)'}
                              </td>
                              <td className="py-2.5 px-3">
                                <Badge variant={s.status === 'OPEN' ? 'success' : 'outline'}>
                                  {s.status}
                                </Badge>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODALS */}
          {/* ========================================================================= */}

          {/* Modal 1: Start Staff Shift (Day, Evening, Night) */}
          {isStartShiftModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-surface-base border border-border-default rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs">
                <div className="flex items-center justify-between border-b border-border-default pb-3">
                  <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                    <Unlock className="w-4 h-4 text-accent-primary" />
                    Start Cashier Staff Shift
                  </h3>
                  <button
                    onClick={() => setIsStartShiftModalOpen(false)}
                    className="text-text-muted hover:text-text-primary cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-text-muted font-semibold mb-1">
                      Select Shift Type *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'DAY', label: 'Day Shift', icon: Sun, desc: 'Morning' },
                        { id: 'EVENING', label: 'Evening Shift', icon: Sunset, desc: 'Afternoon' },
                        { id: 'NIGHT', label: 'Night Shift', icon: Moon, desc: 'Night' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setShiftType(item.id as any)}
                          className={
                            'p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ' +
                            (shiftType === item.id
                              ? 'border-accent-primary bg-accent-primary/10 text-accent-primary font-bold'
                              : 'border-border-default bg-surface-page text-text-secondary hover:border-border-hover')
                          }
                        >
                          <item.icon className="w-4 h-4" />
                          <span className="text-xs">{item.label}</span>
                          <span className="text-[9px] text-text-muted">{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-text-muted font-semibold mb-1">
                      Staff Opening Drawer Cash (₹) *
                    </label>
                    <input
                      type="number"
                      value={shiftOpeningCash}
                      onChange={(e) => setShiftOpeningCash(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      placeholder="500.00"
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-sm font-bold text-text-primary focus:outline-none focus:border-accent-primary font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted font-semibold mb-1">
                      Shift Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={shiftNotes}
                      onChange={(e) => setShiftNotes(e.target.value)}
                      placeholder="e.g. Taking over day shift drawer from Rajesh"
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border-default">
                  <Button variant="secondary" size="sm" onClick={() => setIsStartShiftModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={openShiftMutation.isPending}
                    onClick={() =>
                      openShiftMutation.mutate({
                        openingCash: Number(shiftOpeningCash) || 0,
                        shiftType,
                      })
                    }
                  >
                    {openShiftMutation.isPending ? 'Starting...' : ('Start ' + shiftType + ' Shift')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Modal 2: End Staff Shift (Reconcile & Handover) */}
          {isShiftCloseModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-surface-base border border-border-default rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs">
                <div className="flex items-center justify-between border-b border-border-default pb-3">
                  <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-status-warning" />
                    End Staff Shift &amp; Handover
                  </h3>
                  <button
                    onClick={() => setIsShiftCloseModalOpen(false)}
                    className="text-text-muted hover:text-text-primary cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 rounded-xl text-[11px] border border-amber-200 dark:border-amber-800">
                  Ending this shift closes only your session. <strong>Store Cash Register remains OPEN</strong> for the next shift staff.
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-text-muted font-semibold mb-1">
                      Physical Cash Counted in Drawer (₹) *
                    </label>
                    <input
                      type="number"
                      value={shiftClosingCash}
                      onChange={(e) => setShiftClosingCash(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-sm font-bold text-text-primary focus:outline-none focus:border-accent-primary font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted font-semibold mb-1">
                      Handover Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={shiftNotes}
                      onChange={(e) => setShiftNotes(e.target.value)}
                      placeholder="e.g. Handed over ₹2450 cash drawer to Evening Cashier"
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border-default">
                  <Button variant="secondary" size="sm" onClick={() => setIsShiftCloseModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={closeShiftMutation.isPending}
                    onClick={() =>
                      closeShiftMutation.mutate({
                        closingCash: Number(shiftClosingCash) || 0,
                        notes: shiftNotes,
                      })
                    }
                  >
                    {closeShiftMutation.isPending ? 'Closing...' : 'Confirm Shift Handover'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Modal 3: Close Store Master Cash Register (End of Day Z-Report) */}
          {isRegisterCloseModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-surface-base border border-border-default rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs">
                <div className="flex items-center justify-between border-b border-border-default pb-3">
                  <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                    <Lock className="w-4 h-4 text-status-error" />
                    Close Store Cash Register (End of Day)
                  </h3>
                  <button
                    onClick={() => setIsRegisterCloseModalOpen(false)}
                    className="text-text-muted hover:text-text-primary cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 rounded-xl text-[11px] border border-rose-200 dark:border-rose-800">
                  ⚠ Closing the store cash register will <strong>close all active staff shifts</strong> and generate the End of Day Z-Report.
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-text-muted font-semibold mb-1">
                      Final Store Cash Counted in Drawer (₹) *
                    </label>
                    <input
                      type="number"
                      value={registerClosingCount}
                      onChange={(e) => setRegisterClosingCount(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-sm font-bold text-text-primary focus:outline-none focus:border-accent-primary font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted font-semibold mb-1">
                      Closing Remarks / Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={registerNotes}
                      onChange={(e) => setRegisterNotes(e.target.value)}
                      placeholder="e.g. End of day store closure, total cash deposited in vault"
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border-default">
                  <Button variant="secondary" size="sm" onClick={() => setIsRegisterCloseModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={closeRegisterMutation.isPending}
                    onClick={() =>
                      closeRegisterMutation.mutate({
                        closingCash: Number(registerClosingCount) || 0,
                        notes: registerNotes,
                      })
                    }
                  >
                    {closeRegisterMutation.isPending ? 'Closing...' : 'Close Store Register & Finalize'}
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
