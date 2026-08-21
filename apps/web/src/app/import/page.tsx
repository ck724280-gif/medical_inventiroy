'use client';

import React, { useState, useRef, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FileSpreadsheet,
  Upload,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RotateCcw,
  Boxes,
  IndianRupee,
  Layers,
  History,
  ClipboardPaste,
  Loader2,
} from 'lucide-react';

import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { formatCurrency, formatDate } from '@medical-inventory/shared-utils';

export default function ImportPage() {
  const queryClient = useQueryClient();
  const { selectedBranchId } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialRow = {
    medicineName: '',
    sku: '',
    batchNumber: '',
    expiryDate: '',
    qty: 10,
    purchasePrice: 0,
    sellingPrice: 0,
    mrp: 0,
    taxPercent: 12,
    rackLocation: '',
  };

  const [rows, setRows] = useState<any[]>([
    { ...initialRow },
    { ...initialRow },
    { ...initialRow },
  ]);

  const [resultStatus, setResultStatus] = useState<any | null>(null);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');

  // Fetch Recent Opening Stock Audit
  const { data: recentImports, isLoading: loadingRecent, refetch: refetchRecent } = useQuery({
    queryKey: ['recent-opening-stock', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/inventory/opening-stock/recent', {
        params: { branchId: selectedBranchId || undefined },
      });
      return res.data?.data || res.data || [];
    },
  });

  // Calculate live stats
  const stats = useMemo(() => {
    const valid = rows.filter((r) => r.medicineName?.trim());
    const totalUnits = valid.reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
    const totalCost = valid.reduce((sum, r) => sum + (Number(r.qty) || 0) * (Number(r.purchasePrice) || 0), 0);
    const totalMrp = valid.reduce((sum, r) => sum + (Number(r.qty) || 0) * (Number(r.mrp) || 0), 0);
    return {
      totalItems: valid.length,
      totalUnits,
      totalCost,
      totalMrp,
      potentialProfit: Math.max(0, totalMrp - totalCost),
    };
  }, [rows]);

  const importMutation = useMutation({
    mutationFn: async (payloadRows: any[]) => {
      const formatted = payloadRows.map((r) => ({
        medicineName: r.medicineName || r['Medicine Name'] || r.name,
        sku: r.sku || r['SKU'] || undefined,
        batchNumber: r.batchNumber || r['Batch Number'] || r.batch,
        expiryDate: r.expiryDate || r['Expiry Date'] || r.expiry,
        qty: parseInt(r.qty || r['Quantity'] || '0') || 0,
        purchasePrice: parseFloat(r.purchasePrice || r['Purchase Price'] || '0') || 0,
        sellingPrice: parseFloat(r.sellingPrice || r['Selling Price'] || '0') || 0,
        mrp: parseFloat(r.mrp || r['MRP'] || '0') || 0,
        taxPercent: parseFloat(r.taxPercent || r['GST %'] || '12') || 12,
        rackLocation: r.rackLocation || r['Location'] || undefined,
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
        message: `Opening stock successfully committed! (${data.createdCount || 0} batches created/updated).`,
        errors: [],
      });
      queryClient.invalidateQueries({ queryKey: ['inventory-batches'] });
      queryClient.invalidateQueries({ queryKey: ['recent-opening-stock'] });
      refetchRecent();
      setRows([{ ...initialRow }, { ...initialRow }, { ...initialRow }]);
    },
    onError: (err: any) => {
      setResultStatus({
        success: false,
        message: err.response?.data?.message || 'Opening stock import failed.',
        errors: Array.isArray(err.response?.data?.errors) ? err.response.data.errors : [],
      });
    },
  });

  const handleAddRow = (count = 1) => {
    const newItems = Array.from({ length: count }, () => ({ ...initialRow }));
    setRows([...rows, ...newItems]);
  };

  const handleClearGrid = () => {
    if (window.confirm('Are you sure you want to clear all rows in the grid?')) {
      setRows([{ ...initialRow }, { ...initialRow }, { ...initialRow }]);
      setResultStatus(null);
    }
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) {
      setRows([{ ...initialRow }]);
      return;
    }
    setRows(rows.filter((_, i) => i !== index));
  };

  // Robust CSV parser handling quoted strings and commas
  const parseCsvLine = (text: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result.map((s) => s.replace(/^"|"$/g, '').trim());
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

      const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
      const parsedRows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        const obj: any = {};
        headers.forEach((h, idx) => {
          obj[h] = cols[idx] || '';
        });

        // Smart alias matching
        const medicineName =
          obj['medicinename'] || obj['medicine'] || obj['itemname'] || obj['item'] || obj['name'] || '';
        const sku = obj['sku'] || obj['code'] || obj['itemcode'] || '';
        const batchNumber = obj['batchnumber'] || obj['batchno'] || obj['batch'] || '';
        const expiryDate = obj['expirydate'] || obj['expiry'] || obj['expdate'] || obj['exp'] || '';
        const qty = parseInt(obj['quantity'] || obj['qty'] || obj['stock'] || '0') || 0;
        const purchasePrice = parseFloat(obj['purchaseprice'] || obj['costprice'] || obj['cost'] || obj['rate'] || '0') || 0;
        const sellingPrice = parseFloat(obj['sellingprice'] || obj['saleprice'] || obj['mrp'] || '0') || 0;
        const mrp = parseFloat(obj['mrp'] || obj['maxretailprice'] || '0') || sellingPrice;
        const taxPercent = parseFloat(obj['taxpercent'] || obj['gst'] || obj['gstpercent'] || '12') || 12;
        const rackLocation = obj['racklocation'] || obj['rack'] || obj['location'] || '';

        if (medicineName || batchNumber) {
          parsedRows.push({
            medicineName,
            sku,
            batchNumber,
            expiryDate,
            qty,
            purchasePrice,
            sellingPrice,
            mrp,
            taxPercent,
            rackLocation,
          });
        }
      }

      if (parsedRows.length > 0) {
        setRows(parsedRows);
        setResultStatus({
          success: true,
          message: `Loaded ${parsedRows.length} rows from CSV file. Review and click 'Commit Opening Stock' below.`,
        });
      }
    };
    reader.readAsText(file);
  };

  const handleProcessPaste = () => {
    if (!pasteText.trim()) return;
    const lines = pasteText.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
    const parsedRows: any[] = [];

    lines.forEach((line) => {
      // Split by tab (Excel copy) or comma
      const cols = line.includes('\t')
        ? line.split('\t').map((c) => c.trim().replace(/^"|"$/g, ''))
        : parseCsvLine(line);

      if (cols.length >= 2) {
        // Assume order: Medicine Name, Batch Number, Expiry, Qty, Cost, Selling, MRP, SKU
        parsedRows.push({
          medicineName: cols[0] || '',
          batchNumber: cols[1] || `B-${Date.now().toString(36).toUpperCase()}`,
          expiryDate: cols[2] || '',
          qty: parseInt(cols[3] || '10') || 10,
          purchasePrice: parseFloat(cols[4] || '0') || 0,
          sellingPrice: parseFloat(cols[5] || '0') || 0,
          mrp: parseFloat(cols[6] || '0') || 0,
          sku: cols[7] || '',
          taxPercent: 12,
          rackLocation: '',
        });
      }
    });

    if (parsedRows.length > 0) {
      setRows(parsedRows);
      setShowPasteModal(false);
      setPasteText('');
      setResultStatus({
        success: true,
        message: `Parsed ${parsedRows.length} rows from clipboard paste!`,
      });
    }
  };

  const handleDownloadSampleCsv = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Medicine Name,SKU,Batch Number,Expiry Date,Quantity,Purchase Price,Selling Price,MRP,GST %,Rack Location\n' +
      'Paracetamol 650mg,MED-PCM-650,BT-2026-01,2027-12-31,100,1.20,2.00,2.50,12,Rack-A1\n' +
      'Amoxicillin 500mg,MED-AMX-500,BT-2026-02,2026-10-31,50,5.50,8.50,10.00,12,Rack-B3\n' +
      'Cetirizine 10mg,MED-CTZ-010,BT-2026-03,2028-05-31,200,0.80,1.50,2.00,12,Rack-A2\n' +
      'Azithromycin 500mg,MED-AZI-500,BT-2026-04,2027-08-31,40,15.00,22.00,25.00,18,Rack-C1\n' +
      'Pantoprazole 40mg,MED-PAN-040,BT-2026-05,2028-02-28,150,3.20,5.50,6.00,12,Rack-B1';

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'medcare_opening_stock_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = () => {
    const validRows = rows.filter((r) => r.medicineName?.trim());
    if (validRows.length === 0) {
      alert('Please fill at least one row with a valid Medicine Name.');
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
          {/* Header & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                Opening Stock &amp; CSV Migration Wizard
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Bulk upload existing medicine catalogue, initial batch quantities, purchase rates, and MRPs into your store.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleDownloadSampleCsv}
                className="px-3 py-2 bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 shadow-sm transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                CSV Sample Template
              </button>

              <button
                onClick={() => setShowPasteModal(true)}
                className="px-3 py-2 bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 shadow-sm transition cursor-pointer"
              >
                <ClipboardPaste className="w-4 h-4 text-indigo-500" />
                Paste from Excel
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
                className="px-3.5 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow transition cursor-pointer"
              >
                <Upload className="w-4 h-4 text-sky-400" />
                Upload CSV File
              </button>

              <button
                onClick={handleSubmit}
                disabled={importMutation.isPending || stats.totalItems === 0}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-sky-600/20 transition cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {importMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {importMutation.isPending ? 'Committing...' : `Commit Opening Stock (${stats.totalItems})`}
              </button>
            </div>
          </div>

          {/* Live Valuation KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">Valid Items in Grid</span>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {stats.totalItems} Medicines
              </div>
              <span className="text-[10px] text-slate-400">{rows.length} total rows in table</span>
            </div>

            <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">Total Stock Units</span>
              <div className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-1">
                {stats.totalUnits} Units
              </div>
              <span className="text-[10px] text-slate-400">Total batch quantity</span>
            </div>

            <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">Total Purchase Cost</span>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {formatCurrency(stats.totalCost)}
              </div>
              <span className="text-[10px] text-slate-400">Inventory investment</span>
            </div>

            <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">Total MRP Valuation</span>
              <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(stats.totalMrp)}
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Est. Profit: {formatCurrency(stats.potentialProfit)}
              </span>
            </div>
          </div>

          {/* Result Alert Banner */}
          {resultStatus && (
            <div
              className={`p-4 rounded-2xl border text-xs flex items-start gap-3 shadow-sm ${
                resultStatus.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-300'
                  : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/60 text-red-900 dark:text-red-300'
              }`}
            >
              {resultStatus.success ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-bold text-xs">{resultStatus.message}</p>
                {(Array.isArray(resultStatus.errors) ? resultStatus.errors : []).map((err: any, idx: number) => (
                  <p key={idx} className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">
                    Row {err.row}: {err.error}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Opening Stock Wizard Table */}
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-900 dark:text-white">Live Opening Stock Table</span>
                <span className="text-[11px] text-slate-400">({rows.length} rows)</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddRow(1)}
                  className="px-2.5 py-1.5 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Row
                </button>
                <button
                  type="button"
                  onClick={() => handleAddRow(5)}
                  className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  +5 Rows
                </button>
                <button
                  type="button"
                  onClick={handleClearGrid}
                  className="px-2.5 py-1.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Clear Grid
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/80 rounded-xl">
              <table className="w-full text-left border-collapse text-xs min-w-[950px]">
                <thead className="bg-slate-100/80 dark:bg-[#0c1322] text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Medicine Name *</th>
                    <th className="py-2.5 px-3 min-w-[110px]">SKU</th>
                    <th className="py-2.5 px-3 min-w-[120px]">Batch Number *</th>
                    <th className="py-2.5 px-3 min-w-[130px]">Expiry Date</th>
                    <th className="py-2.5 px-3 text-center min-w-[80px]">Qty</th>
                    <th className="py-2.5 px-3 text-right min-w-[95px]">Cost (₹)</th>
                    <th className="py-2.5 px-3 text-right min-w-[95px]">Selling (₹)</th>
                    <th className="py-2.5 px-3 text-right min-w-[95px]">MRP (₹)</th>
                    <th className="py-2.5 px-3 min-w-[90px]">Rack/Shelf</th>
                    <th className="py-2.5 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
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
                          className="w-full px-2 py-1 bg-white dark:bg-[#090d16] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium focus:outline-none focus:border-sky-500 text-xs"
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
                          placeholder="SKU Code"
                          className="w-full px-2 py-1 bg-white dark:bg-[#090d16] border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-[11px] text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
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
                          placeholder="B2026-01"
                          className="w-full px-2 py-1 bg-white dark:bg-[#090d16] border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-[11px] text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
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
                          className="w-full px-2 py-1 bg-white dark:bg-[#090d16] border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-[11px] text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          placeholder="0"
                          value={row.qty === 0 ? '' : row.qty}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const updated = [...rows];
                            updated[idx].qty = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                            setRows(updated);
                          }}
                          className="w-full px-2 py-1 bg-white dark:bg-[#090d16] border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-center text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 font-bold"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={row.purchasePrice === 0 ? '' : row.purchasePrice}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const updated = [...rows];
                            updated[idx].purchasePrice = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                            setRows(updated);
                          }}
                          className="w-full px-2 py-1 bg-white dark:bg-[#090d16] border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-right text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={row.sellingPrice === 0 ? '' : row.sellingPrice}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const updated = [...rows];
                            updated[idx].sellingPrice = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                            setRows(updated);
                          }}
                          className="w-full px-2 py-1 bg-white dark:bg-[#090d16] border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-right text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={row.mrp === 0 ? '' : row.mrp}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const updated = [...rows];
                            updated[idx].mrp = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                            setRows(updated);
                          }}
                          className="w-full px-2 py-1 bg-white dark:bg-[#090d16] border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-right text-emerald-600 dark:text-emerald-400 font-bold focus:outline-none focus:border-sky-500"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={row.rackLocation}
                          onChange={(e) => {
                            const updated = [...rows];
                            updated[idx].rackLocation = e.target.value;
                            setRows(updated);
                          }}
                          placeholder="A1 / Shelf-2"
                          className="w-full px-2 py-1 bg-white dark:bg-[#090d16] border border-slate-300 dark:border-slate-700 rounded-lg text-[11px] text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition"
                          title="Remove row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Add Row Bar */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => handleAddRow(1)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4 text-sky-500" />
                Add Another Row
              </button>

              <button
                onClick={handleSubmit}
                disabled={importMutation.isPending || stats.totalItems === 0}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md transition disabled:opacity-50"
              >
                {importMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {importMutation.isPending ? 'Committing...' : `Commit Opening Stock (${stats.totalItems})`}
              </button>
            </div>
          </div>

          {/* Recent Opening Stock Audit History */}
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Recent Opening Stock Batches Audit</h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">Latest imported stock batches</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-slate-100/80 dark:bg-[#0c1322] text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Date &amp; Time</th>
                    <th className="py-2.5 px-3">Medicine Name</th>
                    <th className="py-2.5 px-3">Batch Number</th>
                    <th className="py-2.5 px-3">Expiry Date</th>
                    <th className="py-2.5 px-3 text-center">Initial Qty</th>
                    <th className="py-2.5 px-3 text-right">Cost (₹)</th>
                    <th className="py-2.5 px-3 text-right">MRP (₹)</th>
                    <th className="py-2.5 px-3">Imported By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {loadingRecent ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Loading recent opening stock...
                      </td>
                    </tr>
                  ) : (recentImports || []).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No opening stock records found yet.
                      </td>
                    </tr>
                  ) : (
                    recentImports.map((m: any) => (
                      <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono text-slate-500 dark:text-slate-400">{formatDate(m.createdAt)}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{m.medicineName}</td>
                        <td className="py-2.5 px-3 font-mono text-sky-600 dark:text-sky-400">{m.batchNumber}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500 dark:text-slate-400">
                          {m.expiryDate ? formatDate(m.expiryDate) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                          +{m.qty}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                          {formatCurrency(m.purchasePrice)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(m.mrp)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{m.userName}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Paste from Excel Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <ClipboardPaste className="w-4 h-4 text-indigo-500" />
                Paste Rows from Excel / Spreadsheet
              </h3>
              <button
                onClick={() => setShowPasteModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Copy columns from Excel (e.g. <b>Medicine Name, Batch, Expiry, Qty, Cost, Selling, MRP</b>) and paste below:
            </p>

            <textarea
              rows={6}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={`Paracetamol 650mg\tB2026-01\t2027-12-31\t100\t1.20\t2.00\t2.50\nAmoxicillin 500mg\tB2026-02\t2026-10-31\t50\t5.50\t8.50\t10.00`}
              className="w-full p-3 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPasteModal(false)}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessPaste}
                disabled={!pasteText.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
              >
                Import Pasted Rows
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

