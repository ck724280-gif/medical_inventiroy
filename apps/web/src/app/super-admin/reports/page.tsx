'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingUp,
  Building2,
  Calendar,
  ArrowLeft,
  Download,
  FileText,
  DollarSign,
} from 'lucide-react';
import Link from 'next/link';

import { Sidebar } from '../../../components/sidebar';
import { Header } from '../../../components/header';
import { PageHeader } from '../../../components/ui/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { apiClient } from '../../../lib/api-client';
import { formatCurrency } from '@medical-inventory/shared-utils';

export default function SuperAdminReportsPage() {
  const { data: matrix, isLoading } = useQuery({
    queryKey: ['super-admin-branches-matrix'],
    queryFn: async () => {
      const res = await apiClient.get('/super-admin/branches-matrix');
      return res.data?.data || res.data;
    },
  });

  const branches: any[] = matrix || [];
  const totalSalesOrg = branches.reduce((sum, b) => sum + (b.totalSalesAmount || 0), 0);
  const totalStockOrg = branches.reduce((sum, b) => sum + (b.stockValue || 0), 0);

  return (
    <div className="flex h-screen bg-surface-page text-text-primary overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <PageHeader
            title="Consolidated Enterprise Reports & Analytics"
            description="Branch-by-branch revenue contributions, inventory distribution, and profit margin analysis."
            badge={<Badge variant="info">Multi-Store Consolidated</Badge>}
            actions={
              <Link href="/super-admin">
                <Button variant="secondary" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Back to Control Center
                </Button>
              </Link>
            }
          />

          {/* Org Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-surface-base border-border-default">
              <CardHeader className="border-b border-border-default pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-status-success" />
                  Total Cumulative Sales Volume
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-3xl font-black text-status-success mb-2">
                  {formatCurrency(totalSalesOrg)}
                </div>
                <p className="text-xs text-text-muted">
                  Aggregated gross revenue across all {branches.length} registered pharmacy branches.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-surface-base border-border-default">
              <CardHeader className="border-b border-border-default pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-accent-primary" />
                  Total Enterprise Stock Holding Value
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-3xl font-black text-text-primary mb-2">
                  {formatCurrency(totalStockOrg)}
                </div>
                <p className="text-xs text-text-muted">
                  Current cost valuation of active batches in stock across all branch retail shelves.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Branch-wise breakdown */}
          <Card className="bg-surface-base border-border-default">
            <CardHeader className="border-b border-border-default pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-accent-primary" />
                Branch Contribution Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-surface-raised text-text-muted uppercase text-[10px] font-semibold border-b border-border-default">
                  <tr>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Today Revenue</th>
                    <th className="py-3 px-4">All-Time Revenue</th>
                    <th className="py-3 px-4">Revenue Share</th>
                    <th className="py-3 px-4">Inventory Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default text-text-primary">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-text-muted">
                        Loading comparative reports...
                      </td>
                    </tr>
                  ) : branches.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-text-muted">
                        No report data available.
                      </td>
                    </tr>
                  ) : (
                    branches.map((b) => {
                      const share = totalSalesOrg > 0 ? ((b.totalSalesAmount || 0) / totalSalesOrg) * 100 : 0;
                      return (
                        <tr key={b.id} className="hover:bg-surface-raised transition">
                          <td className="py-3 px-4 font-semibold">
                            <span className="font-mono text-xs mr-2 text-text-muted">{b.code}</span>
                            {b.name}
                          </td>
                          <td className="py-3 px-4 font-bold text-status-success">
                            {formatCurrency(b.todaySalesAmount || 0)}
                          </td>
                          <td className="py-3 px-4 font-bold text-text-primary">
                            {formatCurrency(b.totalSalesAmount || 0)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-surface-raised h-2 rounded-full overflow-hidden">
                                <div
                                  className="bg-accent-primary h-full rounded-full"
                                  style={{ width: `${Math.min(100, share)}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-mono">{share.toFixed(1)}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium">
                            {formatCurrency(b.stockValue || 0)}
                          </td>
                        </tr>
                      );
                    })
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
