'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRightLeft,
  CheckCircle,
  Truck,
  Package,
  Clock,
  Send,
  Building2,
  Calendar,
  User,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '../../../components/ui/page-header';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Skeleton } from '../../../components/ui/skeleton';
import { apiClient } from '@/lib/api-client';

const TRANSFER_STAGES = [
  { key: 'DRAFT', label: 'Draft' },
  { key: 'REQUESTED', label: 'Requested' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'DISPATCHED', label: 'Dispatched' },
  { key: 'IN_TRANSIT', label: 'In Transit' },
  { key: 'RECEIVED', label: 'Received' },
  { key: 'COMPLETED', label: 'Completed' },
];

export default function StockTransferDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params?.id as string;

  const { data: transfer, isLoading, isError } = useQuery({
    queryKey: ['stock-transfer', id],
    queryFn: async () => {
      const res = await apiClient.get(`/stock-transfers/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const dispatchMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.patch(`/stock-transfers/${id}/dispatch`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfer', id] });
    },
  });

  const receiveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.patch(`/stock-transfers/${id}/receive`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfer', id] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !transfer) {
    router.replace(`/stock-transfers/${id}/not-found`);
    return null;
  }

  const currentStatusIndex = TRANSFER_STAGES.findIndex((s) => s.key === transfer.status);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <Link
          href="/stock-transfers"
          className="p-2 rounded-lg hover:bg-surface-raised border border-border-default text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <PageHeader
          title={`Stock Transfer #${id.slice(0, 8)}`}
          description={`From ${transfer.fromBranch?.name} to ${transfer.toBranch?.name} (§2).`}
          actions={
            <div className="flex items-center gap-2">
              {transfer.status === 'REQUESTED' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => dispatchMutation.mutate()}
                  disabled={dispatchMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {dispatchMutation.isPending ? 'Dispatching...' : 'Dispatch Transfer'}
                </Button>
              )}
              {transfer.status === 'DISPATCHED' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => receiveMutation.mutate()}
                  disabled={receiveMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  {receiveMutation.isPending ? 'Receiving...' : 'Receive & Add to Stock'}
                </Button>
              )}
            </div>
          }
        />
      </div>

      {/* 7-Stage Visual Lifecycle Progress Bar (§2) */}
      <Card className="border-border-default">
        <CardContent className="p-6">
          <div className="flex items-center justify-between overflow-x-auto pb-2">
            {TRANSFER_STAGES.map((stage, idx) => {
              const isPast = idx < currentStatusIndex;
              const isCurrent = idx === currentStatusIndex;

              return (
                <div key={stage.key} className="flex items-center flex-1 min-w-[100px]">
                  <div className="flex flex-col items-center gap-1.5 flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        isPast
                          ? 'bg-status-success text-white'
                          : isCurrent
                          ? 'bg-accent-primary text-white ring-4 ring-accent-primary/20'
                          : 'bg-surface-raised text-text-muted border border-border-default'
                      }`}
                    >
                      {isPast ? '✓' : idx + 1}
                    </div>
                    <span
                      className={`text-xs text-center font-medium ${
                        isCurrent ? 'text-accent-primary font-semibold' : 'text-text-muted'
                      }`}
                    >
                      {stage.label}
                    </span>
                  </div>
                  {idx < TRANSFER_STAGES.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 ${
                        isPast ? 'bg-status-success' : 'bg-border-default'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Branch & Transfer Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border-default">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-accent-primary" />
              Source & Destination Branches
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between py-1 border-b border-border-subtle">
              <span className="text-text-muted">Source (Origin):</span>
              <span className="font-semibold text-text-primary">{transfer.fromBranch?.name} ({transfer.fromBranch?.code})</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border-subtle">
              <span className="text-text-muted">Destination:</span>
              <span className="font-semibold text-text-primary">{transfer.toBranch?.name} ({transfer.toBranch?.code})</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-muted">Status:</span>
              <Badge variant={transfer.status === 'COMPLETED' ? 'success' : transfer.status === 'DISPATCHED' ? 'warning' : 'default'}>
                {transfer.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border-default">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent-primary" />
              Transfer Audit Timeline (§16)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between py-1 border-b border-border-subtle">
              <span className="text-text-muted">Created:</span>
              <span className="text-text-primary">{new Date(transfer.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border-subtle">
              <span className="text-text-muted">Last Updated:</span>
              <span className="text-text-primary">{new Date(transfer.updatedAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-muted">Transfer Notes:</span>
              <span className="text-text-secondary italic">{transfer.notes || 'No special instructions'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card className="border-border-default">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Package className="w-4 h-4 text-accent-primary" />
            Transferred Medicines ({transfer.items?.length || 0} Items)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-raised text-text-muted text-xs uppercase tracking-wider border-b border-border-default">
                <tr>
                  <th className="py-3 px-4">Medicine</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4 text-right">Transfer Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {transfer.items?.map((item: any) => (
                  <tr key={item.id} className="hover:bg-surface-raised transition-colors">
                    <td className="py-3 px-4 font-semibold text-text-primary">
                      {item.medicine?.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-text-muted">
                      {item.medicine?.sku}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-accent-primary">
                      {item.batch?.batchNumber}
                    </td>
                    <td className="py-3 px-4 text-xs text-text-muted">
                      {item.batch?.expiryDate ? new Date(item.batch.expiryDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-text-primary">
                      {item.qty} units
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
