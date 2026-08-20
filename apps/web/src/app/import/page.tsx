'use client';

import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileSpreadsheet,
  Upload,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';

export default function ImportPage() {
  const queryClient = useQueryClient();
  const { selectedBranchId } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<any[]>([
    {
      medicineName: '',
      sku: '',
      batchNumber: '',
      expiryDate: '',
      qty: 10,
      purchasePrice: 0,
      sellingPrice: 0,
      mrp: 0,
    },
  ]);

  const [resultStatus, setResultStatus] = useState<any | null>(null);

  const importMutation = useMutation({
    mutationFn: async (payloadRows: any[]) => {
      const formatted = payloadRows.map((r) => ({
        medicineName: r.medicineName || r['Medicine Name'] || r.name,
        sku: r.sku || r['SKU'] || undefined,
        batchNumber: r.batchNumber || r['Batch Number'] || r.batch,
        expiryDate: r.expiryDate || r['Expiry Date (YYYY-MM-DD)'] || r.expiry,
        qty: parseInt(r.qty || r['Quantity'] || '0') || 0,
        purchasePrice: parseFloat(r.purchasePrice || r['Purchase Price'] || '0') || 0,
        sellingPrice: parseFloat(r.sellingPrice || r['Selling Price'] || '0') || 0,
        mrp: parseFloat(r.mrp || r['MRP'] || '0') || 0,
      }));

      const res = await apiClient.post('/inventory/opening-stock', {
        branchId: selectedBranchId,
        items: formatted,
      });
      return res.data?.data || res.data;
    },
    onSuccess: (data: any) => {
      setResultStatus({
        success: true,
        message: `Opening stock successfully imported (${data.createdCount || 0} batches created/updated).`,
        errors: [],
      });
      queryClient.invalidateQueries({ queryKey: ['inventory-batches'] });
    },
    onError: (err: any) => {
      setResultStatus({
        success: false,
        message: err.response?.data?.message || 'Opening stock import failed.',
        errors: Array.isArray(err.response?.data?.errors) ? err.response.data.errors : [],
      });
    },
  });

  const handleAddRow = () => {
    setRows([
      ...rows,
      {
        medicineName: '',
        sku: '',
        batchNumber: '',
        expiryDate: '',
        qty: 10,
        purchasePrice: 0,
        sellingPrice: 0,
        mrp: 0,
      },
    ]);
  };

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
      if (lines.length <= 1) return;

      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      const parsedRows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        const obj: any = {};
        headers.forEach((h, idx) => {
          obj[h] = cols[idx] || '';
        });

        parsedRows.push({
          medicineName: obj['Medicine Name'] || obj.medicineName || '',
          sku: obj['SKU'] || obj.sku || '',
          batchNumber: obj['Batch Number'] || obj.batchNumber || '',
          expiryDate: obj['Expiry Date (YYYY-MM-DD)'] || obj.expiryDate || '',
          qty: parseInt(obj['Quantity'] || obj.qty || '0') || 0,
          purchasePrice: parseFloat(obj['Purchase Price'] || obj.purchasePrice || '0') || 0,
          sellingPrice: parseFloat(obj['Selling Price'] || obj.sellingPrice || '0') || 0,
          mrp: parseFloat(obj['MRP'] || obj.mrp || '0') || 0,
        });
      }

      if (parsedRows.length > 0) {
        setRows(parsedRows);
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadSampleCsv = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Medicine Name,SKU,Batch Number,Expiry Date (YYYY-MM-DD),Quantity,Purchase Price,Selling Price,MRP\n' +
      'Paracetamol 650mg,MED-PCM-650,BT-2026-01,2027-12-31,100,1.20,2.00,2.50\n' +
      'Amoxicillin 500mg,MED-AMX-500,BT-2026-02,2026-10-31,50,5.50,8.50,10.00\n' +
      'Cetirizine 10mg,MED-CTZ-010,BT-2026-03,2028-05-31,200,0.80,1.50,2.00';

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'medcare_opening_stock_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = () => {
    const validRows = rows.filter((r) => r.medicineName && r.batchNumber);
    if (validRows.length === 0) {
      alert('Please fill at least one row with Medicine Name and Batch Number.');
      return;
    }
    importMutation.mutate(validRows);
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-200">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <main className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Opening Stock &amp; CSV Migration Wizard
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Bulk upload existing medicine catalogue and opening stock batches from Excel/CSV spreadsheets.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleDownloadSampleCsv}
                className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 shadow-sm transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                Download CSV Sample
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow transition cursor-pointer"
              >
                <Upload className="w-4 h-4 text-sky-400" />
                Upload CSV File
              </button>

              <button
                onClick={handleSubmit}
                disabled={importMutation.isPending}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg transition cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {importMutation.isPending ? 'Importing...' : 'Commit Opening Stock'}
              </button>
            </div>
          </div>

          {/* Result Alert Banner */}
          {resultStatus && (
            <div
              className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${
                resultStatus.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
              }`}
            >
              {resultStatus.success ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 dark:text-red-400" />
              )}
              <div>
                <p className="font-bold">{resultStatus.message}</p>
                {(Array.isArray(resultStatus.errors) ? resultStatus.errors : []).map((err: any, idx: number) => (
                  <p key={idx} className="text-[11px] text-red-600 dark:text-red-400">
                    Row {err.row}: {err.error}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Opening Stock Wizard Table */}
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                <thead className="bg-slate-100/80 dark:bg-[#0c1322] text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider">
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
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
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
