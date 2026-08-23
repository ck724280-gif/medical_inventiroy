'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRightLeft,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  Building2,
  Calendar,
  Layers,
  Search,
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
import { formatDate } from '@medical-inventory/shared-utils';
import { useAuthStore } from '../../stores/auth-store';
import { extractDataArray } from '../../lib/utils';

export default function StockTransfersPage() {
  const queryClient = useQueryClient();
  const { selectedBranchId } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: transfers, isLoading } = useQuery({
    queryKey: ['stock-transfers-list', selectedBranchId, statusFilter],
    queryFn: async () => {
      const res = await apiClient.get('/stock-transfers', {
        params: {
          branchId: selectedBranchId || undefined,
          status: statusFilter || undefined,
          limit: 100,
        },
      });
      return res.data;
    },
  });

  const transferList = extractDataArray(transfers);

  const dispatchMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post(`/stock-transfers/${id}/dispatch`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers-list'] });
      alert('Stock transfer dispatched successfully. Stock reserved from source branch.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to dispatch transfer');
    },
  });

  const receiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post(`/stock-transfers/${id}/receive`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers-list'] });
      alert('Stock transfer received successfully. Stock credited to destination branch.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to receive transfer');
    },
  });

  const filtered = transferList.filter((t: any) => {
    const term = searchTerm.toLowerCase();
    return (
      t.fromBranch?.name?.toLowerCase().includes(term) ||
      t.toBranch?.name?.toLowerCase().includes(term) ||
      t.id?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex h-screen bg-surface-page text-text-primary overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <PageHeader
            title="Inter-Branch Stock Transfers"
            description="Manage stock movements between pharmacy branches, track transit reservations, and accept inward stock."
            badge={<Badge variant="outline">{transferList.length} Transfers</Badge>}
            actions={
              <Link href="/inventory">
                <Button variant="primary" size="sm">
                  <Plus className="w-4 h-4 mr-1.5" />
                  New Transfer Request
                </Button>
              </Link>
            }
          />

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-surface-base p-4 border border-border-default rounded-xl">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
              <input
                type="text"
                placeholder="Search by branch name or transfer ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-surface-page border border-border-default rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-primary"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-surface-page border border-border-default rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-primary"
            >
              <option value="">All Statuses</option>
              <option value="REQUESTED">Requested</option>
              <option value="DISPATCHED">Dispatched (In-Transit)</option>
              <option value="COMPLETED">Completed (Received)</option>
            </select>
          </div>

          {/* Transfers Table */}
          <Card className="bg-surface-base border-border-default">
            <CardHeader className="border-b border-border-default pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-accent-primary" />
                Inter-Branch Stock Transfer Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-surface-raised text-text-muted uppercase text-[10px] font-semibold border-b border-border-default">
                  <tr>
                    <th className="py-3 px-4">Transfer ID</th>
                    <th className="py-3 px-4">Source Branch</th>
                    <th className="py-3 px-4">Destination Branch</th>
                    <th className="py-3 px-4">Items Count</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default text-text-primary">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-text-muted">
                        Loading stock transfers...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-text-muted">
                        No stock transfers recorded.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((t) => (
                      <tr key={t.id} className="hover:bg-surface-raised transition">
                        <td className="py-3 px-4 font-mono font-bold text-accent-primary">
                          #{t.id.slice(0, 8)}
                        </td>
                        <td className="py-3 px-4 font-semibold">
                          {t.fromBranch?.name} ({t.fromBranch?.code})
                        </td>
                        <td className="py-3 px-4 font-semibold">
                          {t.toBranch?.name} ({t.toBranch?.code})
                        </td>
                        <td className="py-3 px-4 font-medium">{t.items?.length || 0} batches</td>
                        <td className="py-3 px-4 text-text-muted">{formatDate(t.createdAt)}</td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              t.status === 'COMPLETED'
                                ? 'success'
                                : t.status === 'DISPATCHED'
                                ? 'warning'
                                : 'info'
                            }
                          >
                            {t.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          {t.status === 'REQUESTED' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={dispatchMutation.isPending}
                              onClick={() => dispatchMutation.mutate(t.id)}
                            >
                              <Send className="w-3.5 h-3.5 mr-1 text-amber-500" />
                              Dispatch
                            </Button>
                          )}
                          {t.status === 'DISPATCHED' && (
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={receiveMutation.isPending}
                              onClick={() => receiveMutation.mutate(t.id)}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Receive
                            </Button>
                          )}
                          <Link
                            href={`/stock-transfers/${t.id}`}
                            className="inline-flex items-center text-accent-primary hover:underline font-semibold text-xs ml-2"
                          >
                            Details →
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
