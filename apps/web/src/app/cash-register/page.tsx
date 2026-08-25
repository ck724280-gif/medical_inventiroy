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

export default function CashRegisterPage() {
  const queryClient = useQueryClient();
  const { user, selectedBranchId } = useAuthStore();
  const [openingFloat, setOpeningFloat] = useState<number | string>('500');
  const [closingCount, setClosingCount] = useState<number | string>('');
  const [closureNotes, setClosureNotes] = useState('');
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

  const { data: shift, isLoading } = useQuery({
    queryKey: ['current-cash-shift', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/cash-registers/current', {
        params: { branchId: selectedBranchId || undefined },
      });
      return res.data?.data || res.data;
    },
  });

  const openShiftMutation = useMutation({
    mutationFn: async (openingCash: number) => {
      const res = await apiClient.post('/cash-registers/open', {
        branchId: selectedBranchId || user?.branches?.[0]?.id,
        openingCash,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-cash-shift'] });
      alert('Cash register opened successfully. Ready for POS billing.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to open shift');
    },
  });

  const closeShiftMutation = useMutation({
    mutationFn: async ({ closingCash, notes }: { closingCash: number; notes: string }) => {
      const res = await apiClient.post(`/cash-registers/${shift.id}/close`, {
        closingCash,
        notes,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-cash-shift'] });
      setIsCloseModalOpen(false);
      alert('Cash drawer closed. Z-Report generated.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to close shift');
    },
  });

  const isOpen = shift?.status === 'OPEN';
  const liveTotals = shift?.liveTotals;

  return (
    <div className="flex h-screen bg-surface-page text-text-primary overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <PageHeader
            title="Cash Register & POS Drawer Reconciliation"
            description="Control active cashier shifts, count drawer cash, reconcile tender types, and generate Z-Reports."
            badge={
              isOpen ? (
                <Badge variant="success">Register OPEN</Badge>
              ) : (
                <Badge variant="outline">Register CLOSED</Badge>
              )
            }
            actions={
              isOpen ? (
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => window.print()}>
                    <Printer className="w-4 h-4 mr-1.5" />
                    X-Report
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      const expected = Number(liveTotals?.expectedDrawerCash ?? ((shift?.openingCash || 0) + (liveTotals?.cashSales || 0)));
                      setClosingCount(expected > 0 ? expected.toFixed(2) : (shift?.openingCash || 0).toFixed(2));
                      setIsCloseModalOpen(true);
                    }}
                  >
                    <Lock className="w-4 h-4 mr-1.5" />
                    Close Shift &amp; Drawer
                  </Button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => openShiftMutation.mutate(Number(openingFloat) || 0)}
                  disabled={openShiftMutation.isPending}
                >
                  <Unlock className="w-4 h-4 mr-1.5" />
                  Open New Shift
                </Button>
              )
            }
          />

          {!isOpen ? (
            <Card className="max-w-md mx-auto bg-surface-base border-border-default shadow-lg p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-accent-primary/10 text-accent-primary rounded-full flex items-center justify-center mx-auto">
                <Wallet className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-text-primary">No Active Shift in Progress</h3>
              <p className="text-xs text-text-muted">
                Please enter the starting drawer float to unlock the POS billing terminal.
              </p>

              <div className="text-left space-y-1.5">
                <label className="text-xs font-semibold text-text-muted">Starting Cash Float (₹)</label>
                <input
                  type="number"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-sm font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                />
              </div>

              <Button
                variant="primary"
                className="w-full"
                onClick={() => openShiftMutation.mutate(Number(openingFloat) || 0)}
                disabled={openShiftMutation.isPending}
              >
                {openShiftMutation.isPending ? 'Opening...' : 'Start Cashier Session'}
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="bg-surface-base border-border-default">
                  <CardContent className="pt-4 space-y-1">
                    <span className="text-[11px] font-semibold text-text-muted">Opening Float</span>
                    <div className="text-xl font-bold text-text-primary">
                      {formatCurrency(shift.openingCash || 0)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-surface-base border-border-default">
                  <CardContent className="pt-4 space-y-1">
                    <span className="text-[11px] font-semibold text-text-muted">Live Cash Sales</span>
                    <div className="text-xl font-bold text-status-success">
                      {formatCurrency(liveTotals?.cashSales || 0)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-surface-base border-border-default">
                  <CardContent className="pt-4 space-y-1">
                    <span className="text-[11px] font-semibold text-text-muted">Digital Sales (UPI/Card)</span>
                    <div className="text-xl font-bold text-accent-primary">
                      {formatCurrency((liveTotals?.upiSales || 0) + (liveTotals?.cardSales || 0))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-surface-base border-border-default">
                  <CardContent className="pt-4 space-y-1">
                    <span className="text-[11px] font-semibold text-text-muted">Expected Drawer Cash</span>
                    <div className="text-xl font-black text-text-primary">
                      {formatCurrency(liveTotals?.expectedDrawerCash || 0)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Shift Details */}
              <Card className="bg-surface-base border-border-default">
                <CardHeader className="border-b border-border-default pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-accent-primary" />
                    Session Details &amp; Operational Counters
                  </CardTitle>
                  <span className="text-xs text-text-muted">
                    Opened: {formatDate(shift.openedAt)}
                  </span>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-border-default">
                    <span className="text-text-muted">Cashier Name</span>
                    <span className="font-semibold text-text-primary">
                      {shift.user?.firstName} {shift.user?.lastName || ''}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border-default">
                    <span className="text-text-muted">Register Status</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      Dispensary Counter (Active)
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border-default">
                    <span className="text-text-muted">Completed Invoices</span>
                    <span className="font-bold text-text-primary">{liveTotals?.totalSalesCount || 0}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-text-muted">Gross Turn Over (All Tenders)</span>
                    <span className="font-extrabold text-accent-primary text-sm">
                      {formatCurrency(liveTotals?.totalSalesAmount || 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Close Shift Modal */}
          {isCloseModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-surface-base border border-border-default rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-border-default pb-3">
                  <h3 className="text-base font-bold text-text-primary">End Shift &amp; Close Drawer</h3>
                  <button
                    onClick={() => setIsCloseModalOpen(false)}
                    className="text-text-muted hover:text-text-primary"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="bg-surface-raised p-3 rounded-xl border border-border-default space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Expected Cash:</span>
                      <span className="font-bold">{formatCurrency(liveTotals?.expectedDrawerCash || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Physical Counted:</span>
                      <span className="font-bold">{formatCurrency(Number(closingCount) || 0)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-border-default font-semibold">
                      <span>Variance / Discrepancy:</span>
                      <span
                        className={
                          (Number(closingCount) || 0) - (liveTotals?.expectedDrawerCash || 0) < 0
                            ? 'text-status-error'
                            : 'text-status-success'
                        }
                      >
                        {formatCurrency((Number(closingCount) || 0) - (liveTotals?.expectedDrawerCash || 0))}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-text-muted font-medium">
                        Actual Physical Cash Counted in Drawer (₹) *
                      </label>
                      <span className="text-[10px] text-accent-primary font-semibold bg-accent-primary/10 px-1.5 py-0.5 rounded">
                        Auto-Calculated (Editable)
                      </span>
                    </div>
                    <input
                      type="number"
                      value={closingCount}
                      onChange={(e) => setClosingCount(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-sm font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted font-medium mb-1">Notes / Discrepancy Reason</label>
                    <textarea
                      placeholder="Optional handover remarks..."
                      value={closureNotes}
                      onChange={(e) => setClosureNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-text-primary text-xs"
                      rows={2}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border-default">
                  <Button variant="secondary" onClick={() => setIsCloseModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={closeShiftMutation.isPending}
                    onClick={() =>
                      closeShiftMutation.mutate({
                        closingCash: Number(closingCount) || 0,
                        notes: closureNotes,
                      })
                    }
                  >
                    {closeShiftMutation.isPending ? 'Closing...' : 'Confirm Closure & Z-Report'}
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
