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
import { PageHeader } from '../../components/ui';
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
    <div className="flex h-screen bg-surface-page text-text-primary overflow-hidden font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <main className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-5">
          {/* Page Header */}
          <PageHeader
            title="Opening Stock Import"
            description="Bulk import medicines and opening inventory via spreadsheet or manual entry."
            actions={
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleDownloadSampleCsv}
                  className="px-3 py-2 bg-surface-base hover:bg-surface-raised text-text-secondary rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-border-default shadow-sm transition cursor-pointer"
                >
                  <Download className="w-4 h-4 text-text-muted" />
                  CSV Sample Template
                </button>

                <button
                  onClick={() => setShowPasteModal(true)}
                  className="px-3 py-2 bg-surface-base hover:bg-surface-raised text-text-secondary rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-border-default shadow-sm transition cursor-pointer"
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
                  className="px-3.5 py-2 bg-surface-raised hover:bg-surface-hover text-text-primary rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-border-strong shadow transition cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-accent-primary" />
                  Upload CSV File
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={importMutation.isPending || stats.totalItems === 0}
                  className="px-4 py-2 bg-accent-primary hover:bg-accent-hover text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md transition cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {importMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {importMutation.isPending ? 'Committing...' : `Commit Opening Stock (${stats.totalItems})`}
                </button>
              </div>
            }
          />

          {/* File Drop Zone */}
          <div
            className="border-2 border-dashed border-border-strong rounded-xl p-10 text-center bg-surface-base hover:bg-surface-raised transition cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileSpreadsheet className="text-text-muted w-10 h-10 mx-auto mb-3" />
            <p className="text-text-primary font-semibold text-base mb-1">Drop your CSV file here</p>
            <p className="text-text-muted text-sm mb-4">
              Or click to browse — supports .csv files with Medicine Name, Batch, Expiry, Qty, Cost, MRP columns
            </p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent-primary hover:bg-accent-hover text-white rounded-xl text-xs font-semibold transition"
            >
              <Upload className="w-4 h-4" />
              Choose CSV File
            </button>
          </div>

          {/* Live Valuation KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-surface-base p-4 rounded-2xl border border-border-default shadow-sm">
              <span className="text-[11px] text-text-muted font-semibold block">Valid Items in Grid</span>
              <div className="text-xl font-bold font-mono text-text-primary mt-1">
                {stats.totalItems} Medicines
              </div>
              <span className="text-[10px] text-text-muted">{rows.length} total rows in table</span>
            </div>

            <div className="bg-surface-base p-4 rounded-2xl border border-border-default shadow-sm">
              <span className="text-[11px] text-text-muted font-semibold block">Total Stock Units</span>
              <div className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-1">
                {stats.totalUnits} Units
              </div>
              <span className="text-[10px] text-text-muted">Total batch quantity</span>
            </div>

            <div className="bg-surface-base p-4 rounded-2xl border border-border-default shadow-sm">
              <span className="text-[11px] text-text-muted font-semibold block">Total Purchase Cost</span>
              <div className="text-xl font-bold font-mono text-text-primary mt-1">
                {formatCurrency(stats.totalCost)}
              </div>
              <span className="text-[10px] text-text-muted">Inventory investment</span>
            </div>

            <div className="bg-surface-base p-4 rounded-2xl border border-border-default shadow-sm">
              <span className="text-[11px] text-text-muted font-semibold block">Total MRP Valuation</span>
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
                  ? 'bg-status-success-bg border-status-success-border text-status-success'
                  : 'bg-status-error-bg border-status-error-border text-status-error'
              }`}
            >
              {resultStatus.success ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-bold text-xs">{resultStatus.message}</p>
                {(Array.isArray(resultStatus.errors) ? resultStatus.errors : []).map((err: any, idx: number) => (
                  <p key={idx} className="text-[11px] text-status-error mt-0.5">
                    Row {err.row}: {err.error}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Opening Stock Wizard Table */}
          <div className="bg-surface-base rounded-2xl border border-border-default shadow-sm overflow-hidden space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-text-primary">Live Opening Stock Table</span>
                <span className="text-[11px] text-text-muted">({rows.length} rows)</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddRow(1)}
                  className="px-2.5 py-1.5 bg-accent-subtle hover:bg-accent-subtle/70 text-accent-primary rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Row
                </button>
                <button
                  type="button"
                  onClick={() => handleAddRow(5)}
                  className="px-2.5 py-1.5 bg-surface-raised hover:bg-surface-hover text-text-secondary rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  +5 Rows
                </button>
                <button
                  type="button"
                  onClick={handleClearGrid}
                  className="px-2.5 py-1.5 bg-status-error-bg hover:bg-red-100 dark:hover:bg-red-900/50 text-status-error rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Clear Grid
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-border-default rounded-xl">
              <table className="w-full text-left border-collapse text-xs min-w-[950px]">
                <thead className="bg-surface-raised text-text-muted font-semibold border-b border-border-default text-[10px] uppercase tracking-wider">
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
                <tbody className="divide-y divide-border-default">
                  {rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-surface-raised">
                      <td className="py-2 px-3 text-text-muted font-mono text-[11px]">{idx + 1}</td>
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
                          className="w-full px-2 py-1 bg-surface-page border border-border-default rounded-lg text-text-primary font-medium focus:outline-none focus:border-[var(--border-focus)] text-xs"
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
                          className="w-full px-2 py-1 bg-surface-page border border-border-default rounded-lg font-mono text-[11px] text-text-primary focus:outline-none focus:border-[var(--border-focus)]"
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
                          className="w-full px-2 py-1 bg-surface-page border border-border-default rounded-lg font-mono text-[11px] text-text-primary focus:outline-none focus:border-[var(--border-focus)]"
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
                          className="w-full px-2 py-1 bg-surface-page border border-border-default rounded-lg font-mono text-[11px] text-text-primary focus:outline-none focus:border-[var(--border-focus)]"
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
                          className="w-full px-2 py-1 bg-surface-page border border-border-default rounded-lg font-mono text-center text-text-primary focus:outline-none focus:border-[var(--border-focus)] font-bold"
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
                          className="w-full px-2 py-1 bg-surface-page border border-border-default rounded-lg font-mono text-right text-text-primary focus:outline-none focus:border-[var(--border-focus)]"
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
                          className="w-full px-2 py-1 bg-surface-page border border-border-default rounded-lg font-mono text-right text-text-primary focus:outline-none focus:border-[var(--border-focus)]"
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
                          className="w-full px-2 py-1 bg-surface-page border border-border-default rounded-lg font-mono text-right text-emerald-600 dark:text-emerald-400 font-bold focus:outline-none focus:border-[var(--border-focus)]"
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
                          className="w-full px-2 py-1 bg-surface-page border border-border-default rounded-lg text-[11px] text-text-primary focus:outline-none focus:border-[var(--border-focus)]"
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          className="p-1 text-text-muted hover:text-status-error rounded-lg transition"
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
                className="px-3 py-1.5 bg-surface-raised hover:bg-surface-hover text-text-secondary rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4 text-accent-primary" />
                Add Another Row
              </button>

              <button
                onClick={handleSubmit}
                disabled={importMutation.isPending || stats.totalItems === 0}
                className="px-5 py-2 bg-accent-primary hover:bg-accent-hover text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md transition disabled:opacity-50"
              >
                {importMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {importMutation.isPending ? 'Committing...' : `Commit Opening Stock (${stats.totalItems})`}
              </button>
            </div>
          </div>

          {/* Recent Opening Stock Audit History */}
          <div className="bg-surface-base rounded-2xl border border-border-default shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-accent-primary" />
                <h3 className="font-bold text-sm text-text-primary">Recent Opening Stock Batches Audit</h3>
              </div>
              <span className="text-xs text-text-muted">Latest imported stock batches</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-surface-raised text-text-muted font-semibold border-b border-border-default text-[10px] uppercase">
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
                <tbody className="divide-y divide-border-default">
                  {loadingRecent ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-text-muted">
                        Loading recent opening stock...
                      </td>
                    </tr>
                  ) : (recentImports || []).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-text-muted">
                        No opening stock records found yet.
                      </td>
                    </tr>
                  ) : (
                    recentImports.map((m: any) => (
                      <tr key={m.id} className="hover:bg-surface-raised">
                        <td className="py-2.5 px-3 font-mono text-text-muted">{formatDate(m.createdAt)}</td>
                        <td className="py-2.5 px-3 font-bold text-text-primary">{m.medicineName}</td>
                        <td className="py-2.5 px-3 font-mono text-accent-primary">{m.batchNumber}</td>
                        <td className="py-2.5 px-3 font-mono text-text-muted">
                          {m.expiryDate ? formatDate(m.expiryDate) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-text-primary">
                          +{m.qty}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-text-secondary">
                          {formatCurrency(m.purchasePrice)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(m.mrp)}
                        </td>
                        <td className="py-2.5 px-3 text-text-secondary">{m.userName}</td>
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
          <div className="bg-surface-overlay rounded-2xl border border-border-default shadow-2xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                <ClipboardPaste className="w-4 h-4 text-indigo-500" />
                Paste Rows from Excel / Spreadsheet
              </h3>
              <button
                onClick={() => setShowPasteModal(false)}
                className="text-text-muted hover:text-text-primary text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-text-muted">
              Copy columns from Excel (e.g. <b>Medicine Name, Batch, Expiry, Qty, Cost, Selling, MRP</b>) and paste below:
            </p>

            <textarea
              rows={6}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={`Paracetamol 650mg\tB2026-01\t2027-12-31\t100\t1.20\t2.00\t2.50\nAmoxicillin 500mg\tB2026-02\t2026-10-31\t50\t5.50\t8.50\t10.00`}
              className="w-full p-3 bg-surface-page border border-border-strong rounded-xl font-mono text-xs text-text-primary focus:outline-none focus:border-[var(--border-focus)]"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPasteModal(false)}
                className="px-3 py-2 bg-surface-raised text-text-secondary rounded-xl text-xs font-semibold hover:bg-surface-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessPaste}
                disabled={!pasteText.trim()}
                className="px-4 py-2 bg-accent-primary hover:bg-accent-hover text-white rounded-xl text-xs font-semibold disabled:opacity-50"
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
