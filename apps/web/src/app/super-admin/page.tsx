'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  Users,
  TrendingUp,
  Boxes,
  DollarSign,
  Receipt,
  Truck,
  ArrowRight,
  ShieldAlert,
  Layers,
  ArrowUpRight,
  RefreshCw,
  Plus,
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
import { formatCurrency } from '@medical-inventory/shared-utils';
import { useAuthStore } from '../../stores/auth-store';

export default function SuperAdminDashboardPage() {
  const { user } = useAuthStore();

  const { data: overview, isLoading: isOverviewLoading } = useQuery({
    queryKey: ['super-admin-overview'],
    queryFn: async () => {
      const res = await apiClient.get('/super-admin/overview');
      return res.data?.data || res.data;
    },
  });

  const { data: matrix, isLoading: isMatrixLoading } = useQuery({
    queryKey: ['super-admin-branches-matrix'],
    queryFn: async () => {
      const res = await apiClient.get('/super-admin/branches-matrix');
      return res.data?.data || res.data;
    },
  });

  const branches = matrix || [];

  return (
    <div className="flex h-screen bg-surface-page text-text-primary overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <PageHeader
            title="Super Admin Organization Control Center"
            description="Consolidated enterprise analytics, multi-branch network health, and centralized management."
            badge={<Badge variant="info">Super Admin Mode</Badge>}
            actions={
              <div className="flex items-center gap-2">
                <Link href="/super-admin/branches">
                  <Button variant="primary" size="sm">
                    <Plus className="w-4 h-4 mr-1.5" />
                    Manage Branches
                  </Button>
                </Link>
                <Link href="/super-admin/staff">
                  <Button variant="secondary" size="sm">
                    <Users className="w-4 h-4 mr-1.5" />
                    Staff Directory
                  </Button>
                </Link>
              </div>
            }
          />

          {/* Consolidated Organization KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-surface-base border-border-default">
              <CardContent className="pt-5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-muted">Total Branches</span>
                  <Building2 className="w-4 h-4 text-accent-primary" />
                </div>
                {isOverviewLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-text-primary">
                      {overview?.activeBranches || 0}
                    </span>
                    <span className="text-xs text-text-muted">
                      / {overview?.totalBranches || 0} ({overview?.maxBranchesAllowed || 50} Max)
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-surface-base border-border-default">
              <CardContent className="pt-5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-muted">Today's Org Sales</span>
                  <TrendingUp className="w-4 h-4 text-status-success" />
                </div>
                {isOverviewLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-black text-status-success">
                    {formatCurrency(overview?.sales?.todayRevenue || 0)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-surface-base border-border-default">
              <CardContent className="pt-5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-muted">All-Time Revenue</span>
                  <Receipt className="w-4 h-4 text-accent-primary" />
                </div>
                {isOverviewLoading ? (
                  <Skeleton className="h-8 w-28" />
                ) : (
                  <div className="text-2xl font-black text-text-primary">
                    {formatCurrency(overview?.sales?.totalRevenue || 0)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-surface-base border-border-default">
              <CardContent className="pt-5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-muted">Total Stock Value</span>
                  <Boxes className="w-4 h-4 text-status-info" />
                </div>
                {isOverviewLoading ? (
                  <Skeleton className="h-8 w-28" />
                ) : (
                  <div className="text-2xl font-black text-text-primary">
                    {formatCurrency(overview?.inventory?.totalPurchaseValue || 0)}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Branch Comparative Matrix */}
          <Card className="bg-surface-base border-border-default">
            <CardHeader className="border-b border-border-default pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-accent-primary" />
                Branch Network Operations & Performance Matrix
              </CardTitle>
              <Badge variant="outline">{branches.length} Branches Registered</Badge>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-surface-raised text-text-muted uppercase text-[10px] font-semibold border-b border-border-default">
                  <tr>
                    <th className="py-3 px-4">Branch Code & Name</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Branch Manager</th>
                    <th className="py-3 px-4">Staff Count</th>
                    <th className="py-3 px-4">Today's Sales</th>
                    <th className="py-3 px-4">Total Stock</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default text-text-primary">
                  {isMatrixLoading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-text-muted">
                        Loading branch network matrix...
                      </td>
                    </tr>
                  ) : branches.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-text-muted">
                        No branches configured.
                      </td>
                    </tr>
                  ) : (
                    branches.map((b: any) => (
                      <tr key={b.id} className="hover:bg-surface-raised transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono px-1.5 py-0.5 bg-surface-raised border border-border-default rounded text-[11px] font-bold">
                              {b.code}
                            </span>
                            <span className="font-semibold text-text-primary">{b.name}</span>
                            {b.isDefault && <Badge variant="info">Main</Badge>}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-text-secondary">{b.city || b.address || '—'}</td>
                        <td className="py-3 px-4 font-medium text-text-primary">
                          {b.manager?.name || 'Unassigned'}
                        </td>
                        <td className="py-3 px-4 font-semibold">{b.staffCount} users</td>
                        <td className="py-3 px-4 font-bold text-status-success">
                          {formatCurrency(b.todaySalesAmount || 0)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-text-primary">
                            {formatCurrency(b.stockValue || 0)}
                          </span>
                          <span className="text-[10px] text-text-muted block">
                            ({b.stockBatchesCount} batches)
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={b.isActive ? 'success' : 'error'}>
                            {b.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/super-admin/branches?id=${b.id}`}
                            className="inline-flex items-center gap-1 text-accent-primary hover:underline font-semibold"
                          >
                            Manage →
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
