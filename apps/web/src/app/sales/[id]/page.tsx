'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Receipt,
  ArrowLeft,
  Printer,
  Share2,
  Calendar,
  User,
  CreditCard,
  Building,
  AlertCircle,
  FileText,
  MessageCircle,
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
import { useBrandingStore } from '../../../stores/branding-store';
import { shareInvoiceViaWhatsApp } from '../../../lib/whatsapp-share';

export default function SalesInvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params?.id as string;
  const { name: storeName } = useBrandingStore();

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['sales-invoice-detail', invoiceId],
    queryFn: async () => {
      const res = await apiClient.get(`/sales/${invoiceId}`);
      return res.data?.data || res.data;
    },
    enabled: !!invoiceId,
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

  if (error || !invoice) {
    return (
      <div className="flex h-screen bg-surface-page text-text-primary overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center">
            <div className="p-8 max-w-md text-center bg-surface-base border border-border-default rounded-2xl shadow-xl">
              <AlertCircle className="w-12 h-12 text-status-error mx-auto mb-4" />
              <h2 className="text-xl font-bold text-text-primary mb-2">Invoice Not Found</h2>
              <p className="text-xs text-text-muted mb-6">
                The requested invoice with UUID <code className="font-mono text-accent-primary">{invoiceId}</code> was not found.
              </p>
              <Link href="/sales">
                <Button variant="primary">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Sales
                </Button>
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const items = invoice.items || [];
  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = async () => {
    if (!invoice.customer?.mobile) {
      alert('Customer mobile number is missing for WhatsApp sharing.');
      return;
    }

    await shareInvoiceViaWhatsApp({
      customerMobile: invoice.customer.mobile,
      customerName: invoice.customer.name,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount || 0,
      storeName: storeName || 'MedCare Pharmacy',
    });
  };

  return (
    <div className="flex h-screen bg-surface-page text-text-primary overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <PageHeader
            title={`Invoice #${invoice.invoiceNumber || '—'}`}
            description={`Date: ${formatDate(invoice.createdAt)} · Billed to: ${invoice.customer?.name || 'Walk-in Customer'}`}
            badge={
              <Badge variant={invoice.paymentStatus === 'PAID' ? 'success' : 'warning'}>
                {invoice.paymentStatus || 'PAID'}
              </Badge>
            }
            actions={
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={handleWhatsApp}>
                  <MessageCircle className="w-4 h-4 mr-1.5 text-emerald-600" />
                  WhatsApp
                </Button>
                <Button variant="secondary" size="sm" onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-1.5" />
                  Print Receipt
                </Button>
                <Link href="/sales">
                  <Button variant="secondary" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    Back
                  </Button>
                </Link>
              </div>
            }
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Invoice Line Items */}
            <Card className="lg:col-span-2 bg-surface-base border-border-default">
              <CardHeader className="border-b border-border-default pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-accent-primary" />
                  Dispensed Medicines & Items
                </CardTitle>
                <Badge variant="outline">{items.length} Items</Badge>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-surface-raised text-text-muted uppercase text-[10px] font-semibold border-b border-border-default">
                    <tr>
                      <th className="py-2.5 px-4">Item / Medicine</th>
                      <th className="py-2.5 px-4">Batch</th>
                      <th className="py-2.5 px-4">Qty</th>
                      <th className="py-2.5 px-4">MRP / Rate</th>
                      <th className="py-2.5 px-4">GST %</th>
                      <th className="py-2.5 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default text-text-primary">
                    {items.map((item: any) => (
                      <tr key={item.id} className="hover:bg-surface-raised transition">
                        <td className="py-2.5 px-4 font-medium">{item.medicine?.name || 'Medicine'}</td>
                        <td className="py-2.5 px-4 font-mono">{item.batch?.batchNumber || item.batchNumber || '—'}</td>
                        <td className="py-2.5 px-4 font-bold">{item.qty}</td>
                        <td className="py-2.5 px-4">{formatCurrency(item.rate || item.mrp || 0)}</td>
                        <td className="py-2.5 px-4">{item.taxPercent || 0}%</td>
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
                  Bill Summary & Tax Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-border-default">
                  <span className="text-text-muted">Subtotal</span>
                  <span className="font-medium text-text-primary">{formatCurrency(invoice.subtotal || 0)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border-default">
                  <span className="text-text-muted">Discount</span>
                  <span className="text-status-success font-medium">-{formatCurrency(invoice.discountAmount || 0)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border-default">
                  <span className="text-text-muted">GST Tax Amount</span>
                  <span className="font-medium text-text-primary">{formatCurrency(invoice.taxAmount || 0)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border-strong text-sm">
                  <span className="font-bold text-text-primary">Net Payable Total</span>
                  <span className="font-extrabold text-accent-primary">{formatCurrency(invoice.totalAmount || 0)}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-text-muted">Payment Mode</span>
                  <span className="font-semibold text-text-primary">
                    {invoice.payments?.[0]?.paymentMode || 'CASH'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
