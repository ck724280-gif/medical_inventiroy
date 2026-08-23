'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  CreditCard,
  ArrowLeft,
  Printer,
  Calendar,
  Building,
  AlertCircle,
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
import { formatCurrency, formatDate } from '@medical-inventory/shared-utils';

export default function ExpenseVoucherDetailPage() {
  const params = useParams();
  const router = useRouter();
  const expenseId = params?.id as string;

  const { data: expense, isLoading, error } = useQuery({
    queryKey: ['expense-detail', expenseId],
    queryFn: async () => {
      const res = await apiClient.get(`/expenses/${expenseId}`);
      return res.data?.data || res.data;
    },
    enabled: !!expenseId,
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

  if (error || !expense) {
    return (
      <div className="flex h-screen bg-surface-page text-text-primary overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center">
            <div className="p-8 max-w-md text-center bg-surface-base border border-border-default rounded-2xl shadow-xl">
              <AlertCircle className="w-12 h-12 text-status-error mx-auto mb-4" />
              <h2 className="text-xl font-bold text-text-primary mb-2">Voucher Not Found</h2>
              <p className="text-xs text-text-muted mb-6">
                The requested expense voucher with UUID <code className="font-mono text-accent-primary">{expenseId}</code> was not found.
              </p>
              <Link href="/expenses">
                <Button variant="primary">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Expenses
                </Button>
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-surface-page text-text-primary overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <PageHeader
            title={`Payment Voucher #${expense.voucherNumber || expense.id.slice(0, 8)}`}
            description={`Category: ${expense.category} · Date: ${formatDate(expense.date || expense.createdAt)}`}
            badge={<Badge variant="warning">{expense.category}</Badge>}
            actions={
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => window.print()}>
                  <Printer className="w-4 h-4 mr-1.5" />
                  Print Voucher
                </Button>
                <Link href="/expenses">
                  <Button variant="secondary" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    Back
                  </Button>
                </Link>
              </div>
            }
          />

          <div className="max-w-2xl mx-auto">
            <Card className="bg-surface-base border-border-default shadow-lg print:border-none print:shadow-none">
              <CardHeader className="border-b border-border-default pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-accent-primary" />
                  Cash/Bank Disbursement Voucher
                </CardTitle>
                <span className="font-mono text-xs text-text-muted">UUID: {expense.id}</span>
              </CardHeader>
              <CardContent className="pt-6 space-y-4 text-xs">
                <div className="flex justify-between py-2 border-b border-border-default">
                  <span className="text-text-muted">Voucher Title / Payee</span>
                  <span className="font-semibold text-text-primary text-sm">{expense.title || expense.payee || 'Expense'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border-default">
                  <span className="text-text-muted">Expense Category</span>
                  <Badge variant="outline">{expense.category}</Badge>
                </div>
                <div className="flex justify-between py-2 border-b border-border-default">
                  <span className="text-text-muted">Disbursed Amount</span>
                  <span className="text-base font-extrabold text-status-error">{formatCurrency(expense.amount || 0)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border-default">
                  <span className="text-text-muted">Payment Mode</span>
                  <span className="font-medium text-text-primary">{expense.paymentMode || 'CASH'}</span>
                </div>
                {expense.notes && (
                  <div className="py-2 border-b border-border-default">
                    <span className="text-text-muted block mb-1">Remarks & Details</span>
                    <p className="text-text-secondary bg-surface-raised p-2.5 rounded-lg">{expense.notes}</p>
                  </div>
                )}
                <div className="flex justify-between py-2 text-text-muted text-[11px]">
                  <span>Authorized By: {expense.createdByUser?.firstName || 'Admin'}</span>
                  <span>Timestamp: {formatDate(expense.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
