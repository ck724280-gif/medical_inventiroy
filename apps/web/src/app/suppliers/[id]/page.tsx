'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Truck,
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Building,
  CreditCard,
  AlertCircle,
  Calendar,
  FileText,
  ShieldCheck,
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

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supplierId = params?.id as string;

  const { data: supplier, isLoading, error } = useQuery({
    queryKey: ['supplier-detail', supplierId],
    queryFn: async () => {
      const res = await apiClient.get(`/suppliers/${supplierId}`);
      return res.data?.data || res.data;
    },
    enabled: !!supplierId,
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

  if (error || !supplier) {
    return (
      <div className="flex h-screen bg-surface-page text-text-primary overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center">
            <div className="p-8 max-w-md text-center bg-surface-base border border-border-default rounded-2xl shadow-xl">
              <AlertCircle className="w-12 h-12 text-status-error mx-auto mb-4" />
              <h2 className="text-xl font-bold text-text-primary mb-2">Supplier Not Found</h2>
              <p className="text-xs text-text-muted mb-6">
                The requested distributor or supplier with UUID <code className="font-mono text-accent-primary">{supplierId}</code> was not found.
              </p>
              <Link href="/suppliers">
                <Button variant="primary">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Suppliers
                </Button>
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const purchases = supplier.purchases || [];
  const balance = Number(supplier.currentBalance || 0);

  return (
    <div className="flex h-screen bg-surface-page text-text-primary overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <PageHeader
            title={supplier.name || 'Supplier Details'}
            description={`Company: ${supplier.company || '—'} · DL: ${supplier.drugLicense || 'N/A'} · GSTIN: ${supplier.gstNumber || 'Unregistered'}`}
            badge={
              balance > 0 ? (
                <Badge variant="error">Payable: {formatCurrency(balance)}</Badge>
              ) : (
                <Badge variant="success">Settled</Badge>
              )
            }
            actions={
              <Link href="/suppliers">
                <Button variant="secondary" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Back to List
                </Button>
              </Link>
            }
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Supplier Details Card */}
            <Card className="bg-surface-base border-border-default">
              <CardHeader className="border-b border-border-default pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Truck className="w-4 h-4 text-accent-primary" />
                  Agency & Ledger Information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-border-default">
                  <span className="text-text-muted">Contact Person</span>
                  <span className="font-medium text-text-primary">{supplier.contactPerson || '—'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border-default">
                  <span className="text-text-muted flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Phone
                  </span>
                  <span className="font-mono font-medium text-text-primary">{supplier.phone || '—'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border-default">
                  <span className="text-text-muted flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Email
                  </span>
                  <span className="text-text-primary">{supplier.email || '—'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border-default">
                  <span className="text-text-muted flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Address
                  </span>
                  <span className="text-right text-text-primary max-w-[180px] truncate">{supplier.address || '—'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border-default">
                  <span className="text-text-muted">Payment Terms</span>
                  <span className="font-medium text-text-primary">{supplier.paymentTerms || 'Net 30'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border-default">
                  <span className="text-text-muted">Outstanding Payable</span>
                  <span className={`font-bold ${balance > 0 ? 'text-status-error' : 'text-status-success'}`}>
                    {formatCurrency(balance)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-text-muted">Registration Date</span>
                  <span className="text-text-primary">{formatDate(supplier.createdAt)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Purchases Ledger Table */}
            <Card className="lg:col-span-2 bg-surface-base border-border-default">
              <CardHeader className="border-b border-border-default pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-accent-primary" />
                  Recent Inward Purchases & Bills
                </CardTitle>
                <Badge variant="info">{purchases.length} Purchase Bills</Badge>
              </CardHeader>
              <CardContent className="pt-4 p-0 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-surface-raised text-text-muted uppercase text-[10px] font-semibold border-b border-border-default">
                    <tr>
                      <th className="py-2.5 px-4">Invoice #</th>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Total Amount</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default text-text-primary">
                    {purchases.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-text-muted">
                          No purchase bills recorded for this supplier.
                        </td>
                      </tr>
                    ) : (
                      purchases.map((p: any) => (
                        <tr key={p.id} className="hover:bg-surface-raised transition">
                          <td className="py-2.5 px-4 font-mono font-medium">{p.invoiceNumber}</td>
                          <td className="py-2.5 px-4">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-text-muted" />
                              {formatDate(p.createdAt)}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-bold">{formatCurrency(p.totalAmount || 0)}</td>
                          <td className="py-2.5 px-4">
                            <Badge variant={p.status === 'COMPLETED' ? 'success' : 'outline'}>
                              {p.status || 'RECEIVED'}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <Link
                              href={`/purchases/${p.id}`}
                              className="text-accent-primary hover:underline font-semibold"
                            >
                              View Bill →
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
