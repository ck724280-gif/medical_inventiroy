'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Boxes,
  ArrowLeft,
  Calendar,
  Layers,
  AlertCircle,
  Building,
  DollarSign,
  Truck,
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
import { formatCurrency, formatDate } from '@medical-inventory/shared-utils';

export default function BatchInventoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params?.id as string;

  const { data: batch, isLoading, error } = useQuery({
    queryKey: ['batch-detail', batchId],
    queryFn: async () => {
      const res = await apiClient.get(`/batches/${batchId}`);
      return res.data?.data || res.data;
    },
    enabled: !!batchId,
  });

  if (isLoading) {
    return (
      <div className="flex h-screen bg-surface-page text-text-primary overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-64 rounded-xl max-w-xl mx-auto" />
          </main>
        </div>
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="flex h-screen bg-surface-page text-text-primary overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center">
            <div className="p-8 max-w-md text-center bg-surface-base border border-border-default rounded-2xl shadow-xl">
              <AlertCircle className="w-12 h-12 text-status-error mx-auto mb-4" />
              <h2 className="text-xl font-bold text-text-primary mb-2">Batch Not Found</h2>
              <p className="text-xs text-text-muted mb-6">
                The requested stock batch with UUID <code className="font-mono text-accent-primary">{batchId}</code> was not found.
              </p>
              <Link href="/inventory">
                <Button variant="primary">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Inventory
                </Button>
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const isExpired = new Date(batch.expiryDate) < new Date();
  const isNearExpiry = !isExpired && (new Date(batch.expiryDate).getTime() - Date.now()) < 90 * 86400000;

  return (
    <div className="flex h-screen bg-surface-page text-text-primary overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <PageHeader
            title={`Batch #${batch.batchNumber || '—'}`}
            description={`Medicine: ${batch.medicine?.name || '—'} · Expiry: ${formatDate(batch.expiryDate)}`}
            badge={
              isExpired ? (
                <Badge variant="error">Expired</Badge>
              ) : isNearExpiry ? (
                <Badge variant="warning">Near Expiry</Badge>
              ) : (
                <Badge variant="success">Active</Badge>
              )
            }
            actions={
              <Link href="/inventory">
                <Button variant="secondary" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Back to Inventory
                </Button>
              </Link>
            }
          />

          <div className="max-w-2xl mx-auto">
            <Card className="bg-surface-base border-border-default">
              <CardHeader className="border-b border-border-default pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-accent-primary" />
                  Stock Batch Details
                </CardTitle>
                <span className="font-mono text-xs text-text-muted">UUID: {batch.id}</span>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-border-default">
                  <span className="text-text-muted">Medicine Name</span>
                  <span className="font-semibold text-text-primary">{batch.medicine?.name || '—'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border-default">
                  <span className="text-text-muted">Current Available Quantity</span>
                  <span className="font-extrabold text-accent-primary text-sm">{batch.currentQty} units</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border-default">
                  <span className="text-text-muted">Initial Inward Quantity</span>
                  <span className="font-medium text-text-primary">{batch.initialQty || batch.currentQty} units</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border-default">
                  <span className="text-text-muted">Expiry Date</span>
                  <span className={`font-semibold ${isExpired ? 'text-status-error' : isNearExpiry ? 'text-status-warning' : 'text-text-primary'}`}>
                    {formatDate(batch.expiryDate)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border-default">
                  <span className="text-text-muted">Purchase Price</span>
                  <span className="font-medium text-text-primary">{formatCurrency(batch.purchasePrice || 0)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border-default">
                  <span className="text-text-muted">MRP</span>
                  <span className="font-medium text-text-primary">{formatCurrency(batch.mrp || 0)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border-default">
                  <span className="text-text-muted">Selling Rate</span>
                  <span className="font-bold text-accent-primary">{formatCurrency(batch.sellingPrice || 0)}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-text-muted">Distributor / Supplier</span>
                  <span className="text-text-primary">{batch.supplier?.name || '—'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
