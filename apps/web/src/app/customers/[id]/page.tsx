'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  AlertCircle,
  Calendar,
  MessageCircle,
  Receipt,
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
import { formatCurrency, formatDate, generatePaymentReminderUrl } from '@medical-inventory/shared-utils';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params?.id as string;

  const { data: customer, isLoading, error } = useQuery({
    queryKey: ['customer-detail', customerId],
    queryFn: async () => {
      const res = await apiClient.get(`/customers/${customerId}`);
      return res.data?.data || res.data;
    },
    enabled: !!customerId,
  });

  if (isLoading) {
    return (
      <div className="flex h-screen bg-surface-page text-text-primary overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            <Skeleton className="h-10 w-48" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-64 rounded-xl md:col-span-2" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="flex h-screen bg-surface-page text-text-primary overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center">
            <div className="p-8 max-w-md text-center bg-surface-base border border-border-default rounded-2xl shadow-xl">
              <AlertCircle className="w-12 h-12 text-status-error mx-auto mb-4" />
              <h2 className="text-xl font-bold text-text-primary mb-2">Customer Not Found</h2>
              <p className="text-xs text-text-muted mb-6">
                The requested customer with UUID <code className="font-mono text-accent-primary">{customerId}</code> was not found.
              </p>
              <Link href="/customers">
                <Button variant="primary">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Customers
                </Button>
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const sales = customer.sales || [];
  const balance = Number(customer.currentBalance || 0);

  const whatsappReminderUrl = customer.mobile
    ? generatePaymentReminderUrl(
        customer.mobile,
        customer.name,
        balance,
        'MedCare Pharmacy'
      )
    : '';

  return (
    <div className="flex h-screen bg-surface-page text-text-primary overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <PageHeader
            title={customer.name || 'Customer Profile'}
            description={`Mobile: ${customer.mobile || '—'} · GSTIN: ${customer.gstNumber || 'Unregistered'}`}
            badge={
              balance > 0 ? (
                <Badge variant="error">Due: {formatCurrency(balance)}</Badge>
              ) : (
                <Badge variant="success">All Clear</Badge>
              )
            }
            actions={
              <div className="flex items-center gap-2">
                {balance > 0 && whatsappReminderUrl && (
                  <a
                    href={whatsappReminderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    WhatsApp Reminder
                  </a>
                )}
                <Link href="/customers">
                  <Button variant="secondary" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    Back to List
                  </Button>
                </Link>
              </div>
            }
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Customer Details Card */}
            <Card className="bg-surface-base border-border-default">
              <CardHeader className="border-b border-border-default pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-accent-primary" />
                  Account & Credit Ledger
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-border-default">
                  <span className="text-text-muted flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Mobile
                  </span>
                  <span className="font-mono font-medium text-text-primary">{customer.mobile || '—'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border-default">
                  <span className="text-text-muted flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Email
                  </span>
                  <span className="text-text-primary">{customer.email || '—'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border-default">
                  <span className="text-text-muted flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Address
                  </span>
                  <span className="text-right text-text-primary max-w-[180px] truncate">{customer.address || '—'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border-default">
                  <span className="text-text-muted flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" /> Credit Limit
                  </span>
                  <span className="font-semibold text-text-primary">{formatCurrency(customer.creditLimit || 0)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border-default">
                  <span className="text-text-muted">Outstanding Balance</span>
                  <span className={`font-bold ${balance > 0 ? 'text-status-error' : 'text-status-success'}`}>
                    {formatCurrency(balance)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-text-muted">Registration Date</span>
                  <span className="text-text-primary">{formatDate(customer.createdAt)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Sales Invoices Ledger */}
            <Card className="lg:col-span-2 bg-surface-base border-border-default">
              <CardHeader className="border-b border-border-default pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-accent-primary" />
                  Recent Invoices & Transactions
                </CardTitle>
                <Badge variant="info">{sales.length} Invoices</Badge>
              </CardHeader>
              <CardContent className="pt-4 p-0 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-surface-raised text-text-muted uppercase text-[10px] font-semibold border-b border-border-default">
                    <tr>
                      <th className="py-2.5 px-4">Invoice #</th>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Total Amount</th>
                      <th className="py-2.5 px-4">Payment Status</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default text-text-primary">
                    {sales.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-text-muted">
                          No transaction history available for this customer.
                        </td>
                      </tr>
                    ) : (
                      sales.map((inv: any) => (
                        <tr key={inv.id} className="hover:bg-surface-raised transition">
                          <td className="py-2.5 px-4 font-mono font-medium">{inv.invoiceNumber}</td>
                          <td className="py-2.5 px-4">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-text-muted" />
                              {formatDate(inv.createdAt)}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-bold">{formatCurrency(inv.totalAmount || 0)}</td>
                          <td className="py-2.5 px-4">
                            <Badge variant={inv.paymentStatus === 'PAID' ? 'success' : 'warning'}>
                              {inv.paymentStatus || 'PAID'}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <Link
                              href={`/sales/${inv.id}`}
                              className="text-accent-primary hover:underline font-semibold"
                            >
                              View Invoice →
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
