'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  LogIn,
} from 'lucide-react';

import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { DosageForm } from '@medical-inventory/shared-types';

export default function ImportPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, selectedBranchId, user } = useAuthStore();

  const [rows, setRows] = useState<any[]>([
    {
      medicineName: 'Amoxicillin 500mg',
      sku: 'AMX-500',
      dosageForm: DosageForm.CAPSULE,
      batchNumber: 'AMX2026-01',
      mfgDate: '2025-01-01',
      expiryDate: '2027-06-30',
      qty: 100,
      purchasePrice: 45,
      mrp: 85,
      sellingPrice: 75,
      taxPercent: 12,
    },
    {
      medicineName: 'Cetirizine 10mg',
      sku: 'CET-10',
      dosageForm: DosageForm.TABLET,
      batchNumber: 'CET-998',
      mfgDate: '2025-02-01',
      expiryDate: '2028-01-31',
      qty: 250,
      purchasePrice: 12,
      mrp: 35,
      sellingPrice: 30,
      taxPercent: 12,
    },
  ]);

  const [resultStatus, setResultStatus] = useState<any | null>(null);

  const importMutation = useMutation({
    mutationFn: async () => {
      // 1. Resolve branch ID
      const branchId = selectedBranchId || user?.branches?.[0]?.id;
      if (!branchId) {
        throw new Error('Please select a branch or log in as store admin.');
      }

      // 2. Filter valid filled rows only
      const validRows = rows.filter(
        (r) => r.medicineName && r.medicineName.trim().length > 0 && r.batchNumber && r.batchNumber.trim().length > 0
      );

      if (validRows.length === 0) {
        throw new Error('Please fill in at least one medicine name and batch number.');
      }

      const res = await apiClient.post('/import-export/opening-stock', {
        branchId,
        rows: validRows.map((r) => ({
          ...r,
          qty: Number(r.qty) || 1,
          purchasePrice: Number(r.purchasePrice) || 0,
          mrp: Number(r.mrp) || 0,
          sellingPrice: Number(r.sellingPrice) || 0,
          taxPercent: Number(r.taxPercent) || 0,
        })),
      });
      return res.data;
    },
    onSuccess: (data) => {
      setResultStatus(data);
    },
    onError: (err: any) => {
      setResultStatus({
        success: false,
        message: err.response?.data?.message || err.message || 'Import failed',
        errors: err.response?.data?.errors,
      });
    },
  });

  const addRow = () => {
    setRows([
      ...rows,
      {
        medicineName: '',
        sku: '',
        dosageForm: DosageForm.TABLET,
        batchNumber: '',
        mfgDate: '2025-01-01',
        expiryDate: '2027-12-31',
        qty: 100,
        purchasePrice: 10,
        mrp: 20,
        sellingPrice: 18,
        taxPercent: 12,
      },
    ]);
  };

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Opening Stock Import Wizard (§42)
              </h2>
              <p className="text-xs text-slate-500">
                Bulk initialize starting inventory, batches, and prices before opening counter operations.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={addRow}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Row
              </button>
              <button
                onClick={() => importMutation.mutate()}
                disabled={importMutation.isPending || rows.length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow transition cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                {importMutation.isPending ? 'Importing...' : 'Commit Opening Stock'}
              </button>
            </div>
          </div>

          {/* Not signed-in alert */}
          {!isAuthenticated && !isLoading && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  You are currently browsing as a <strong>Guest</strong>. Please sign in with your store administrator account to commit stock.
                </span>
              </div>
              <button
                onClick={() => router.push('/login')}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In (admin@medcare.com)
              </button>
            </div>
          )}

          {/* Result Alert Banner */}
          {resultStatus && (
            <div
              className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${
                resultStatus.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {resultStatus.success ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
              )}
              <div>
                <p className="font-bold">{resultStatus.message}</p>
                {resultStatus.errors?.map((err: any, idx: number) => (
                  <p key={idx} className="text-[11px] text-red-600">
                    Row {err.row}: {err.error}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Opening Stock Wizard Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Medicine Name *</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Batch Number *</th>
                    <th className="py-2.5 px-3">Expiry Date *</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Cost (₹)</th>
                    <th className="py-2.5 px-3 text-right">Selling (₹)</th>
                    <th className="py-2.5 px-3 text-right">MRP (₹)</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={row.medicineName}
                          onChange={(e) => {
                            const updated = [...rows];
                            updated[idx].medicineName = e.target.value;
                            setRows(updated);
                          }}
                          placeholder="e.g. Paracetamol 650mg"
                          className="w-full px-2 py-1 border border-slate-300 rounded font-medium focus:outline-none focus:border-sky-500"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={row.sku}
                          onChange={(e) => {
                            const updated = [...rows];
                            updated[idx].sku = e.target.value;
                            setRows(updated);
                          }}
                          placeholder="SKU"
                          className="w-24 px-2 py-1 border border-slate-300 rounded font-mono text-[11px] focus:outline-none focus:border-sky-500"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={row.batchNumber}
                          onChange={(e) => {
                            const updated = [...rows];
                            updated[idx].batchNumber = e.target.value;
                            setRows(updated);
                          }}
                          placeholder="B2026-1"
                          className="w-28 px-2 py-1 border border-slate-300 rounded font-mono text-[11px] focus:outline-none focus:border-sky-500"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="date"
                          value={row.expiryDate}
                          onChange={(e) => {
                            const updated = [...rows];
                            updated[idx].expiryDate = e.target.value;
                            setRows(updated);
                          }}
                          className="w-32 px-2 py-1 border border-slate-300 rounded font-mono text-[11px] focus:outline-none focus:border-sky-500"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          value={row.qty}
                          onChange={(e) => {
                            const updated = [...rows];
                            updated[idx].qty = parseInt(e.target.value) || 0;
                            setRows(updated);
                          }}
                          className="w-16 px-2 py-1 border border-slate-300 rounded font-mono text-center focus:outline-none focus:border-sky-500"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={row.purchasePrice}
                          onChange={(e) => {
                            const updated = [...rows];
                            updated[idx].purchasePrice = parseFloat(e.target.value) || 0;
                            setRows(updated);
                          }}
                          className="w-20 px-2 py-1 border border-slate-300 rounded font-mono text-right focus:outline-none focus:border-sky-500"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={row.sellingPrice}
                          onChange={(e) => {
                            const updated = [...rows];
                            updated[idx].sellingPrice = parseFloat(e.target.value) || 0;
                            setRows(updated);
                          }}
                          className="w-20 px-2 py-1 border border-slate-300 rounded font-mono text-right focus:outline-none focus:border-sky-500"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={row.mrp}
                          onChange={(e) => {
                            const updated = [...rows];
                            updated[idx].mrp = parseFloat(e.target.value) || 0;
                            setRows(updated);
                          }}
                          className="w-20 px-2 py-1 border border-slate-300 rounded font-mono text-right focus:outline-none focus:border-sky-500"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        {rows.length > 1 && (
                          <button
                            onClick={() => removeRow(idx)}
                            className="p-1 text-red-500 hover:text-red-700 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
