'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Pill,
  ArrowLeft,
  Barcode,
  Layers,
  AlertCircle,
  Calendar,
  Building,
  CheckCircle2,
  Clock,
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

export default function MedicineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const medicineId = params?.id as string;

  const { data: medicine, isLoading, error } = useQuery({
    queryKey: ['medicine-detail', medicineId],
    queryFn: async () => {
      const res = await apiClient.get(`/medicines/${medicineId}`);
      return res.data?.data || res.data;
    },
    enabled: !!medicineId,
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

  if (error || !medicine) {
    return (
      <div className="flex h-screen bg-surface-page text-text-primary overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center">
            <div className="p-8 max-w-md text-center bg-surface-base border border-border-default rounded-2xl shadow-xl">
              <AlertCircle className="w-12 h-12 text-status-error mx-auto mb-4" />
              <h2 className="text-xl font-bold text-text-primary mb-2">Medicine Not Found</h2>
              <p className="text-xs text-text-muted mb-6">
                The requested medicine with UUID <code className="font-mono text-accent-primary">{medicineId}</code> was not found or has been archived.
              </p>
              <Link href="/medicines">
                <Button variant="primary">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Medicines
                </Button>
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const batches = medicine.batches || [];
  const totalStock = batches.reduce((sum: number, b: any) => sum + (b.currentQty || 0), 0);

  return (
    <div className="flex h-screen bg-surface-page text-text-primary overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <PageHeader
            title={medicine.name || 'Medicine Details'}
            description={`Composition: ${medicine.composition || medicine.genericName || 'N/A'} · SKU: ${medicine.sku || 'N/A'}`}
            badge={
              totalStock > 0 ? (
                totalStock <= (medicine.reorderLevel || 10) ? (
                  <Badge variant="warning">Low Stock ({totalStock})</Badge>
                ) : (
                  <Badge variant="success">In Stock ({totalStock})</Badge>
                )
              ) : (
                <Badge variant="error">Out of Stock</Badge>
              )
            }
            actions={
              <Link href="/medicines">
                <Button variant="secondary" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Back to List
                </Button>
              </Link>
            }
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Overview Card */}
            <Card className="bg-surface-base border-border-default">
              <CardHeader className="border-b border-border-default pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Pill className="w-4 h-4 text-accent-primary" />
                  Master Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-border-default">
                  <span className="text-text-muted">Brand Name</span>
                  <span className="font-medium text-text-primary">{medicine.brandName || '—'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border-default">
                  <span className="text-text-muted">Category</span>
                  <span className="font-medium text-text-primary">{medicine.category?.name || '—'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border-default">
                  <span className="text-text-muted">Manufacturer</span>
                  <span className="font-medium text-text-primary">{medicine.manufacturer?.name || '—'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border-default">
                  <span className="text-text-muted">Default MRP</span>
                  <span className="font-bold text-text-primary">{formatCurrency(medicine.mrp || 0)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border-default">
                  <span className="text-text-muted">Default Selling Price</span>
                  <span className="font-bold text-accent-primary">{formatCurrency(medicine.defaultSellingPrice || 0)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border-default">
                  <span className="text-text-muted">Barcode (EAN13)</span>
                  <span className="font-mono text-text-primary">{medicine.barcode || '—'}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-text-muted">Schedule Drug</span>
                  <Badge variant={medicine.isScheduleH ? 'warning' : 'outline'}>
                    {medicine.drugSchedule || (medicine.isScheduleH ? 'Schedule H' : 'OTC')}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Batches Table */}
            <Card className="lg:col-span-2 bg-surface-base border-border-default">
              <CardHeader className="border-b border-border-default pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-accent-primary" />
                  Active Batches & Expiry (FEFO Queue)
                </CardTitle>
                <Badge variant="info">{batches.length} Batches</Badge>
              </CardHeader>
              <CardContent className="pt-4 p-0 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-surface-raised text-text-muted uppercase text-[10px] font-semibold border-b border-border-default">
                    <tr>
                      <th className="py-2.5 px-4">Batch Number</th>
                      <th className="py-2.5 px-4">Expiry Date</th>
                      <th className="py-2.5 px-4">Stock (Base)</th>
                      <th className="py-2.5 px-4">MRP</th>
                      <th className="py-2.5 px-4">Selling Rate</th>
                      <th className="py-2.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default text-text-primary">
                    {batches.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-text-muted">
                          No stock batches available for this medicine.
                        </td>
                      </tr>
                    ) : (
                      batches.map((b: any) => (
                        <tr key={b.id} className="hover:bg-surface-raised transition">
                          <td className="py-2.5 px-4 font-mono font-medium">{b.batchNumber}</td>
                          <td className="py-2.5 px-4">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-text-muted" />
                              {formatDate(b.expiryDate)}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-bold">{b.currentQty} units</td>
                          <td className="py-2.5 px-4">{formatCurrency(b.mrp || 0)}</td>
                          <td className="py-2.5 px-4 font-semibold text-accent-primary">
                            {formatCurrency(b.sellingPrice || 0)}
                          </td>
                          <td className="py-2.5 px-4">
                            <Badge variant={b.status === 'ACTIVE' ? 'success' : 'outline'}>
                              {b.status}
                            </Badge>
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
