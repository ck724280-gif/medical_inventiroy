'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  Boxes,
  AlertTriangle,
  ShoppingCart,
  Receipt,
  Package,
  BarChart3,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { Sidebar } from '../components/sidebar';
import { Header } from '../components/header';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  DataTable,
  Column,
  Skeleton,
  EmptyState,
} from '../components/ui';
import { apiClient } from '../lib/api-client';
import { useAuthStore } from '../stores/auth-store';
import { formatCurrency, formatDate } from '@medical-inventory/shared-utils';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading, selectedBranchId } = useAuthStore();

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthLoading, isAuthenticated, router]);

  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['dashboard-summary', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard/summary', {
        params: { branchId: selectedBranchId || undefined },
      });
      return res.data?.data || res.data || {};
    },
    enabled: isAuthenticated,
  });

  const { data: recentInvoicesData, isLoading: isRecentInvoicesLoading } = useQuery({
    queryKey: ['dashboard-recent-invoices', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/sales', {
        params: {
          branchId: selectedBranchId || undefined,
          limit: 5,
        },
      });
      return Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.sales || []);
    },
    enabled: isAuthenticated,
  });

  if (isAuthLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-page text-accent">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <p className="text-xs font-mono tracking-wider animate-pulse text-text-muted">
            LOADING WORKSPACE...
          </p>
        </div>
      </div>
    );
  }

  const invoiceColumns: Column<any>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      accessor: (row) => (
        <span className="font-mono font-medium text-accent hover:underline">
          {row.invoiceNumber || '—'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date & Time',
      accessor: (row) => (
        <span className="text-text-secondary text-xs">
          {row.createdAt ? formatDate(row.createdAt) : '—'}
        </span>
      ),
    },
    {
      key: 'patientName',
      header: 'Customer / Patient',
      accessor: (row) => (
        <span className="text-text-primary font-medium text-xs truncate max-w-[140px] block">
          {row.patientName || row.customer?.name || 'Walk-in Customer'}
        </span>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Amount',
      align: 'right',
      accessor: (row) => (
        <span className="font-mono font-semibold text-text-primary">
          {formatCurrency(row.totalAmount || 0)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      accessor: (row) => {
        const isCompleted = row.status === 'COMPLETED';
        const isPartReturned = row.status === 'PARTIALLY_RETURNED';
        const isCancelled = row.status === 'CANCELLED';
        const variant = isCompleted
          ? 'success'
          : isPartReturned
          ? 'warning'
          : isCancelled
          ? 'error'
          : 'info';
        return (
          <Badge variant={variant} size="sm">
            {row.status || 'PAID'}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="flex h-screen bg-surface-page text-text-primary font-sans transition-colors duration-200 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <main className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6 pb-16 lg:pb-0 animate-fade-in">
          {/* ── ROW 1: 4 Compact KPI Tiles Grid (2-col mobile, 4-col desktop) ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Today's Sales */}
            <Card elevation="raised" className="p-4 sm:p-5">
              {isSummaryLoading ? (
                <div className="space-y-2">
                  <Skeleton variant="line" width="60%" />
                  <Skeleton variant="block" height={32} />
                  <Skeleton variant="line" width="40%" />
                </div>
              ) : (
                <div className="flex flex-col justify-between h-full space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-muted">Today's Sales</span>
                    <span className="inline-flex items-center text-xs font-semibold text-status-success">
                      <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                      Live
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-text-primary tracking-tight font-mono">
                      {formatCurrency(summary?.todaySales || 0)}
                    </h3>
                    <p className="text-xs text-text-muted mt-1">
                      <span className="font-semibold text-text-secondary">
                        {summary?.todaySalesCount || 0}
                      </span>{' '}
                      invoices today
                    </p>
                  </div>
                </div>
              )}
            </Card>

            {/* 2. Net Revenue / Gross Profit */}
            <Card elevation="raised" className="p-4 sm:p-5">
              {isSummaryLoading ? (
                <div className="space-y-2">
                  <Skeleton variant="line" width="60%" />
                  <Skeleton variant="block" height={32} />
                  <Skeleton variant="line" width="40%" />
                </div>
              ) : (
                <div className="flex flex-col justify-between h-full space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-muted">Net Revenue (Est.)</span>
                    <span className="inline-flex items-center text-xs font-semibold text-accent">
                      <Sparkles className="w-3.5 h-3.5 mr-0.5" />
                      Gross
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-text-primary tracking-tight font-mono">
                      {formatCurrency(summary?.todayGrossProfit || 0)}
                    </h3>
                    <p className="text-xs text-text-muted mt-1">Based on batch COGS</p>
                  </div>
                </div>
              )}
            </Card>

            {/* 3. Stock Valuation */}
            <Card elevation="raised" className="p-4 sm:p-5">
              {isSummaryLoading ? (
                <div className="space-y-2">
                  <Skeleton variant="line" width="60%" />
                  <Skeleton variant="block" height={32} />
                  <Skeleton variant="line" width="40%" />
                </div>
              ) : (
                <div className="flex flex-col justify-between h-full space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-muted">Stock Value</span>
                    <span className="inline-flex items-center text-xs font-semibold text-text-muted">
                      <Boxes className="w-3.5 h-3.5 mr-0.5" />
                      Inventory
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-text-primary tracking-tight font-mono">
                      {formatCurrency(summary?.currentStockValue || 0)}
                    </h3>
                    <p className="text-xs text-text-muted mt-1">Across active branch batches</p>
                  </div>
                </div>
              )}
            </Card>

            {/* 4. Low-Stock & Expiry Alerts */}
            <Card elevation="raised" className="p-4 sm:p-5">
              {isSummaryLoading ? (
                <div className="space-y-2">
                  <Skeleton variant="line" width="60%" />
                  <Skeleton variant="block" height={32} />
                  <Skeleton variant="line" width="40%" />
                </div>
              ) : (
                <div className="flex flex-col justify-between h-full space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-muted">Low-Stock Alerts</span>
                    <span className="inline-flex items-center text-xs font-semibold text-status-warning">
                      <AlertTriangle className="w-3.5 h-3.5 mr-0.5" />
                      Attention
                    </span>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-status-error font-mono">
                        {summary?.expiredStockCount || 0}
                      </span>
                      <span className="text-xs text-text-muted">Exp</span>
                      <span className="text-text-muted/40">|</span>
                      <span className="text-2xl font-bold text-status-warning font-mono">
                        {summary?.lowStockCount || 0}
                      </span>
                      <span className="text-xs text-text-muted">Low</span>
                    </div>
                    <p className="text-xs text-text-muted mt-1">Critical stock requiring action</p>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* ── ROW 2: Full-Width Sales Trend Recharts LineChart ── */}
          <Card elevation="raised" className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-bold text-sm text-text-primary">7-Day Sales Performance Trend</h4>
                <p className="text-xs text-text-muted mt-0.5">Real-time revenue and billing telemetry</p>
              </div>
              <Badge variant="outline" size="sm">
                Revenue (₹)
              </Badge>
            </div>

            <div className="h-64 w-full">
              {isSummaryLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Skeleton variant="block" height="100%" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={summary?.salesTrend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="var(--text-muted)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: 'var(--border-default)' }}
                    />
                    <YAxis
                      stroke="var(--text-muted)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: 'var(--border-default)' }}
                    />
                    <Tooltip
                      formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Revenue']}
                      contentStyle={{
                        backgroundColor: 'var(--surface-overlay)',
                        borderColor: 'var(--border-default)',
                        borderRadius: '0.5rem',
                        color: 'var(--text-primary)',
                        boxShadow: 'var(--shadow-md)',
                        fontSize: '12px',
                      }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                      labelStyle={{ color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="var(--accent-primary)"
                      strokeWidth={2.5}
                      dot={{ fill: 'var(--accent-primary)', r: 3.5, stroke: 'var(--surface-base)', strokeWidth: 2 }}
                      activeDot={{ r: 5, fill: 'var(--accent-primary)', stroke: 'var(--surface-base)', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* ── ROW 3: 2-Column Grid (Recent Invoices & Quick Actions) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Recent Invoices DataTable (2 cols on lg) */}
            <div className="lg:col-span-2 flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-text-primary">Recent Invoices</h4>
                  <p className="text-xs text-text-muted">Latest sales transactions at the counter</p>
                </div>
                <Link href="/sales">
                  <Button variant="ghost" size="sm" rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}>
                    View All Sales
                  </Button>
                </Link>
              </div>

              <DataTable
                columns={invoiceColumns}
                data={recentInvoicesData || []}
                isLoading={isRecentInvoicesLoading}
                keyExtractor={(item, idx) => item?.id || item?.invoiceNumber || idx}
                compact
                emptyTitle="No Recent Invoices"
                emptyDescription="Invoices generated in the POS will appear here."
              />
            </div>

            {/* Right: Quick Actions Panel (1 col on lg) */}
            <Card elevation="raised" className="flex flex-col justify-between">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span>Quick Actions</span>
                  <span className="text-xs font-normal text-text-muted">Fast Access</span>
                </CardTitle>
                <CardDescription>Common pharmacy operational workflows</CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 flex-1 flex flex-col justify-center">
                <Link href="/pos" className="w-full">
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full justify-start font-medium"
                    leftIcon={<ShoppingCart className="w-4 h-4 text-accent-foreground" />}
                  >
                    Go to POS Counter (F1)
                  </Button>
                </Link>

                <Link href="/purchases" className="w-full">
                  <Button
                    variant="secondary"
                    size="md"
                    className="w-full justify-start font-medium"
                    leftIcon={<Receipt className="w-4 h-4 text-text-secondary" />}
                  >
                    New Purchase / Inward
                  </Button>
                </Link>

                <Link href="/medicines" className="w-full">
                  <Button
                    variant="secondary"
                    size="md"
                    className="w-full justify-start font-medium"
                    leftIcon={<Package className="w-4 h-4 text-text-secondary" />}
                  >
                    Add / Manage Medicine
                  </Button>
                </Link>

                <Link href="/reports" className="w-full">
                  <Button
                    variant="secondary"
                    size="md"
                    className="w-full justify-start font-medium"
                    leftIcon={<BarChart3 className="w-4 h-4 text-text-secondary" />}
                  >
                    View Financial Reports
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
