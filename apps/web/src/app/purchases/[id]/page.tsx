'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  ArrowLeft,
  Truck,
  Calendar,
  CreditCard,
  Building,
  AlertCircle,
  CheckCircle2,
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

export default function PurchaseBillDetailPage() {
  const params = useParams();
  const router = useRouter();
  const purchaseId = params?.id as string;

  const { data: purchase, isLoading, error } = useQuery({
    queryKey: ['purchase-bill-detail', purchaseId],
    queryFn: async () => {
      const res = await apiClient.get(`/purchases/${purchaseId}`);
      return res.data?.data || res.data;
    },
    enabled: !!purchaseId,
  });

  if (isLoading) {
    return (
      <div className="flex h-screen bg-surface-page text-text-primary overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-96 rounded-xl" />
          </main>
        </div>
      </div>
    );
  }

  if (error || !purchase) {
    return (
      <div className="flex h-screen bg-surface-page text-text-primary overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center">
            <div className="p-8 max-w-md text-center bg-surface-base border border-border-default rounded-2xl shadow-xl">
              <AlertCircle className="w-12 h-12 text-status-error mx-auto mb-4" />
              <h2 className="text-xl font-bold text-text-primary mb-2">Purchase Bill Not Found</h2>
              <p className="text-xs text-text-muted mb-6">
                The requested purchase invoice with UUID <code className="font-mono text-accent-primary">{purchaseId}</code> was not found.
              </p>
              <Link href="/purchases">
                <Button variant="primary">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Purchases
                </Button>
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const items = purchase.items || [];

  return (
    <div className="flex h-screen bg-surface-page text-text-primary overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <PageHeader
            title={`Purchase Bill #${purchase.invoiceNumber || '—'}`}
            description={`Distributor: ${purchase.supplier?.name || '—'} (${purchase.supplier?.company || ''}) · Date: ${formatDate(purchase.createdAt)}`}
            badge={
              <Badge variant={purchase.status === 'COMPLETED' ? 'success' : 'outline'}>
                {purchase.status || 'RECEIVED'}
              </Badge>
            }
            actions={
              <Link href="/purchases">
                <Button variant="secondary" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Back to Purchases
                </Button>
              </Link>
            }
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Purchase Line Items */}
            <Card className="lg:col-span-2 bg-surface-base border-border-default">
              <CardHeader className="border-b border-border-default pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-accent-primary" />
                  Inward Medicine Batches
                </CardTitle>
                <Badge variant="outline">{items.length} Inward Items</Badge>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-surface-raised text-text-muted uppercase text-[10px] font-semibold border-b border-border-default">
                    <tr>
                      <th className="py-2.5 px-4">Medicine</th>
                      <th className="py-2.5 px-4">Batch Number</th>
                      <th className="py-2.5 px-4">Expiry</th>
                      <th className="py-2.5 px-4">Qty</th>
                      <th className="py-2.5 px-4">Purchase Rate</th>
                      <th className="py-2.5 px-4">MRP</th>
                      <th className="py-2.5 px-4 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default text-text-primary">
                    {items.map((item: any) => (
                      <tr key={item.id} className="hover:bg-surface-raised transition">
                        <td className="py-2.5 px-4 font-medium">{item.medicine?.name || 'Medicine'}</td>
                        <td className="py-2.5 px-4 font-mono">{item.batchNumber || '—'}</td>
                        <td className="py-2.5 px-4">{item.expiryDate ? formatDate(item.expiryDate) : '—'}</td>
                        <td className="py-2.5 px-4 font-bold">{item.qty}</td>
                        <td className="py-2.5 px-4">{formatCurrency(item.purchasePrice || 0)}</td>
                        <td className="py-2.5 px-4">{formatCurrency(item.mrp || 0)}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-accent-primary">
                          {formatCurrency(item.lineTotal || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Bill Summary */}
            <Card className="bg-surface-base border-border-default">
              <CardHeader className="border-b border-border-default pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-accent-primary" />
                  Cost & Input Tax Credit
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-border-default">
                  <span className="text-text-muted">Taxable Subtotal</span>
                  <span className="font-medium text-text-primary">{formatCurrency(purchase.subtotal || 0)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border-default">
                  <span className="text-text-muted">Trade Discount</span>
                  <span className="text-status-success font-medium">-{formatCurrency(purchase.discountAmount || 0)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border-default">
                  <span className="text-text-muted">GST Input Tax Credit</span>
                  <span className="font-medium text-text-primary">{formatCurrency(purchase.taxAmount || 0)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border-strong text-sm">
                  <span className="font-bold text-text-primary">Total Inward Value</span>
                  <span className="font-extrabold text-accent-primary">{formatCurrency(purchase.totalAmount || 0)}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-text-muted">Supplier GSTIN</span>
                  <span className="font-mono text-text-primary">{purchase.supplier?.gstNumber || 'Unregistered'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
