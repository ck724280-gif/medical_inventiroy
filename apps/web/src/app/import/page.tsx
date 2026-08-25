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
  Printer,
  Search,
  Filter,
  FileText,
  Building2,
  Calendar,
  Check,
} from 'lucide-react';

import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { PageHeader } from '../../components/ui/page-header';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { useBrandingStore } from '../../stores/branding-store';
import { formatCurrency, formatDate } from '@medical-inventory/shared-utils';

export default function OpeningClosingStockPage() {
  const queryClient = useQueryClient();
  const { selectedBranchId } = useAuthStore();
  const { name: storeName } = useBrandingStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Tab: 'opening' | 'closing'
  const [activeTab, setActiveTab] = useState<'opening' | 'closing'>('opening');

  // Search & Filter for Closing Stock
  const [closingSearch, setClosingSearch] = useState('');
  const [closingCategory, setClosingCategory] = useState('ALL');

  // ----------------------------------------------------
  // OPENING STOCK STATE & HANDLERS
  // ----------------------------------------------------
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
    enabled: activeTab === 'opening',
  });

  // Calculate live stats for Opening Stock Grid
  const openingStats = useMemo(() => {
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
      return res.data;
    },
    onSuccess: (data) => {
      setResultStatus({
        success: true,
        message: data.message || 'Opening stock successfully committed to inventory!',
        summary: data.data || data,
      });
      setRows([{ ...initialRow }, { ...initialRow }, { ...initialRow }]);
      queryClient.invalidateQueries({ queryKey: ['recent-opening-stock'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-overview'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-closing-stock'] });
    },
    onError: (err: any) => {
      setResultStatus({
        success: false,
        message: err.response?.data?.message || 'Failed to commit opening stock.',
      });
    },
  });

  const handleRowChange = (index: number, field: string, value: any) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setRows(updated);
  };

  const addRow = (count = 1) => {
    const newItems = Array.from({ length: count }, () => ({ ...initialRow }));
    setRows((prev) => [...prev, ...newItems]);
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) {
      setRows([{ ...initialRow }]);
      return;
    }
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      alert('CSV must contain a header row and at least one data row.');
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const parsedRows = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      if (cols.length === 0 || !cols[0]) continue;

      const rowObj: any = { ...initialRow };
      headers.forEach((h, colIdx) => {
        const val = cols[colIdx] || '';
        if (h.includes('medicine') || h.includes('name')) rowObj.medicineName = val;
        else if (h.includes('sku') || h.includes('barcode')) rowObj.sku = val;
        else if (h.includes('batch')) rowObj.batchNumber = val;
        else if (h.includes('expiry') || h.includes('exp')) rowObj.expiryDate = val;
        else if (h.includes('qty') || h.includes('quantity')) rowObj.qty = parseInt(val) || 10;
        else if (h.includes('cost') || h.includes('purchase')) rowObj.purchasePrice = parseFloat(val) || 0;
        else if (h.includes('sell') || h.includes('rate')) rowObj.sellingPrice = parseFloat(val) || 0;
        else if (h.includes('mrp')) rowObj.mrp = parseFloat(val) || 0;
        else if (h.includes('tax') || h.includes('gst')) rowObj.taxPercent = parseFloat(val) || 12;
        else if (h.includes('rack') || h.includes('location')) rowObj.rackLocation = val;
      });

      if (rowObj.medicineName) {
        parsedRows.push(rowObj);
      }
    }

    if (parsedRows.length > 0) {
      setRows(parsedRows);
      setResultStatus({
        success: true,
        message: 'Loaded ' + parsedRows.length + ' rows from CSV spreadsheet.',
      });
    } else {
      alert('No valid medicine rows could be parsed from the file.');
    }
  };

  const handlePasteProcess = () => {
    if (!pasteText.trim()) return;
    const lines = pasteText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const parsedRows: any[] = [];

    lines.forEach((line) => {
      const cols = line.split('\t').map((c) => c.trim());
      if (cols.length > 0 && cols[0]) {
        parsedRows.push({
          medicineName: cols[0] || '',
          sku: cols[1] || '',
          batchNumber: cols[2] || 'B-' + new Date().getFullYear(),
          expiryDate: cols[3] || '2027-12-31',
          qty: parseInt(cols[4]) || 10,
          purchasePrice: parseFloat(cols[5]) || 0,
          sellingPrice: parseFloat(cols[6]) || 0,
          mrp: parseFloat(cols[7]) || 0,
          taxPercent: parseFloat(cols[8]) || 12,
          rackLocation: cols[9] || '',
        });
      }
    });

    if (parsedRows.length > 0) {
      setRows(parsedRows);
      setShowPasteModal(false);
      setPasteText('');
      setResultStatus({
        success: true,
        message: 'Successfully imported ' + parsedRows.length + ' rows from clipboard!',
      });
    }
  };

  const downloadSampleTemplate = () => {
    const csvContent =
      'Medicine Name,SKU,Batch Number,Expiry Date,Quantity,Purchase Price,Selling Price,MRP,GST %,Location\n' +
      'Paracetamol 650mg,PCM-650,B2026-01,2027-12-31,100,1.20,2.00,2.50,12,Rack-A1\n' +
      'Amoxicillin 500mg,AMX-500,B2026-02,2026-06-30,50,4.50,7.00,8.00,12,Rack-B2\n' +
      'Azithromycin 500mg,AZI-500,B2026-03,2028-01-15,40,12.00,18.00,22.00,12,Rack-C1\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'opening_stock_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ----------------------------------------------------
  // CLOSING STOCK STATE & HANDLERS
  // ----------------------------------------------------
  const { data: closingStockData, isLoading: loadingClosing, refetch: refetchClosing } = useQuery({
    queryKey: ['inventory-closing-stock', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/reports/inventory', {
        params: { branchId: selectedBranchId || undefined },
      });
      return res.data?.data || res.data || { items: [], summary: {} };
    },
    enabled: activeTab === 'closing',
  });

  const { data: fullBatchesData, isLoading: loadingBatches } = useQuery({
    queryKey: ['inventory-overview-batches', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/inventory/overview', {
        params: { branchId: selectedBranchId || undefined, limit: 1000 },
      });
      return res.data?.data || res.data?.items || res.data || [];
    },
    enabled: activeTab === 'closing',
  });

  // Flattened Live Batches for Closing Stock
  const allClosingBatches = useMemo(() => {
    const rawList = Array.isArray(fullBatchesData)
      ? fullBatchesData
      : (fullBatchesData?.items || []);

    const list: any[] = [];
    rawList.forEach((med: any) => {
      if (Array.isArray(med.batches) && med.batches.length > 0) {
        med.batches.forEach((b: any) => {
          list.push({
            id: b.id || med.id + '_' + b.batchNumber,
            medicineName: med.name,
            genericName: med.genericName,
            sku: med.sku || 'N/A',
            category: med.category?.name || med.category || 'General',
            unit: med.baseUnit?.abbreviation || med.baseUnit || 'PCS',
            batchNumber: b.batchNumber,
            expiryDate: b.expiryDate,
            currentQty: b.currentQty || 0,
            purchasePrice: b.purchasePrice || 0,
            sellingPrice: b.sellingPrice || 0,
            mrp: b.mrp || 0,
            purchaseValuation: (b.currentQty || 0) * (b.purchasePrice || 0),
            mrpValuation: (b.currentQty || 0) * (b.mrp || 0),
          });
        });
      } else {
        // Fallback for medicines with stock aggregate
        list.push({
          id: med.id,
          medicineName: med.name,
          genericName: med.genericName,
          sku: med.sku || 'N/A',
          category: med.category?.name || med.category || 'General',
          unit: med.baseUnit?.abbreviation || med.baseUnit || 'PCS',
          batchNumber: 'Primary Batch',
          expiryDate: null,
          currentQty: med.totalStock || med.stock || 0,
          purchasePrice: med.purchasePrice || 0,
          sellingPrice: med.sellingPrice || 0,
          mrp: med.mrp || 0,
          purchaseValuation: (med.totalStock || med.stock || 0) * (med.purchasePrice || 0),
          mrpValuation: (med.totalStock || med.stock || 0) * (med.mrp || 0),
        });
      }
    });
    return list;
  }, [fullBatchesData]);

  // Filtered Closing Batches
  const filteredClosingBatches = useMemo(() => {
    return allClosingBatches.filter((item) => {
      const matchSearch =
        closingSearch === '' ||
        item.medicineName?.toLowerCase().includes(closingSearch.toLowerCase()) ||
        item.genericName?.toLowerCase().includes(closingSearch.toLowerCase()) ||
        item.sku?.toLowerCase().includes(closingSearch.toLowerCase()) ||
        item.batchNumber?.toLowerCase().includes(closingSearch.toLowerCase());

      const matchCategory =
        closingCategory === 'ALL' || item.category === closingCategory;

      return matchSearch && matchCategory;
    });
  }, [allClosingBatches, closingSearch, closingCategory]);

  // Closing Stock Totals
  const closingTotals = useMemo(() => {
    const totalItems = filteredClosingBatches.length;
    const totalQty = filteredClosingBatches.reduce((s, it) => s + (it.currentQty || 0), 0);
    const totalPurchaseValue = filteredClosingBatches.reduce((s, it) => s + (it.purchaseValuation || 0), 0);
    const totalMrpValue = filteredClosingBatches.reduce((s, it) => s + (it.mrpValuation || 0), 0);
    const grossMargin = Math.max(0, totalMrpValue - totalPurchaseValue);
    const marginPct = totalPurchaseValue > 0 ? ((grossMargin / totalPurchaseValue) * 100).toFixed(1) : '0';

    return { totalItems, totalQty, totalPurchaseValue, totalMrpValue, grossMargin, marginPct };
  }, [filteredClosingBatches]);

  // Unique Categories
  const categoriesList = useMemo(() => {
    const cats = new Set<string>();
    allClosingBatches.forEach((b) => {
      if (b.category) cats.add(b.category);
    });
    return Array.from(cats);
  }, [allClosingBatches]);

  // EXPORT CSV FOR CLOSING STOCK
  const exportClosingCSV = () => {
    if (filteredClosingBatches.length === 0) {
      alert('No stock records available to export.');
      return;
    }
    const headerRow = 'Medicine Name,Generic Composition,SKU,Category,Batch Number,Expiry Date,Current Stock Qty,Unit,Purchase Cost Rate (₹),MRP Rate (₹),Total Cost Valuation (₹),Total MRP Valuation (₹)\n';
    const rowsText = filteredClosingBatches
      .map((it) =>
        [
          '"' + (it.medicineName || '').replace(/"/g, '""') + '"',
          '"' + (it.genericName || '').replace(/"/g, '""') + '"',
          '"' + (it.sku || '') + '"',
          '"' + (it.category || '') + '"',
          '"' + (it.batchNumber || '') + '"',
          it.expiryDate ? formatDate(it.expiryDate) : 'N/A',
          it.currentQty,
          it.unit,
          it.purchasePrice,
          it.mrp,
          it.purchaseValuation.toFixed(2),
          it.mrpValuation.toFixed(2),
        ].join(',')
      )
      .join('\n');

    const blob = new Blob([headerRow + rowsText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'closing_stock_report_' + new Date().toISOString().split('T')[0] + '.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // EXPORT EXCEL FOR CLOSING STOCK VIA API
  const exportClosingExcel = async () => {
    try {
      const res = await apiClient.get('/reports/inventory/export/excel', {
        params: { branchId: selectedBranchId || undefined },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'closing_stock_inventory_' + new Date().toISOString().split('T')[0] + '.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      exportClosingCSV();
    }
  };

  // PRINT CLOSING STOCK PDF
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="flex h-screen bg-surface-page text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-200">
      <div className="print:hidden">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="print:hidden">
          <Header />
        </div>

        <main className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Printable Header (Visible only when printing) */}
          <div className="hidden print:block mb-6 border-b pb-4">
            <h1 className="text-2xl font-bold">{storeName || 'Medical Pharmacy Inventory'}</h1>
            <p className="text-sm text-slate-600">
              Closing Stock Valuation Report | Generated on: {new Date().toLocaleString('en-IN')}
            </p>
            <div className="flex justify-between mt-3 text-xs">
              <span><b>Total Stock Units:</b> {closingTotals.totalQty}</span>
              <span><b>Total Cost Value:</b> {formatCurrency(closingTotals.totalPurchaseValue)}</span>
              <span><b>Total MRP Value:</b> {formatCurrency(closingTotals.totalMrpValue)}</span>
            </div>
          </div>

          {/* Top Page Header */}
          <div className="print:hidden flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-text-primary tracking-tight flex items-center gap-2">
                <Boxes className="w-5 h-5 text-accent-primary" />
                Opening / Closing Stock
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Manage initial batch imports (Opening Stock) and inspect live branch valuation &amp; stock registers (Closing Stock).
              </p>
            </div>

            {/* Tab Toggle Buttons */}
            <div className="flex items-center gap-1.5 bg-surface-base p-1.5 rounded-2xl border border-border-default shadow-sm">
              <button
                onClick={() => setActiveTab('opening')}
                className={'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ' +
                  (activeTab === 'opening'
                    ? 'bg-accent-primary text-white shadow'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-raised')}
              >
                <Upload className="w-4 h-4" />
                <span>Opening Stock (Import)</span>
              </button>

              <button
                onClick={() => setActiveTab('closing')}
                className={'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ' +
                  (activeTab === 'closing'
                    ? 'bg-accent-primary text-white shadow'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-raised')}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Closing Stock (Export &amp; Live)</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: OPENING STOCK IMPORT */}
          {/* ========================================================================= */}
          {activeTab === 'opening' && (
            <div className="space-y-6">
              {/* Import Options Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-base p-4 rounded-2xl border border-border-default shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={downloadSampleTemplate}
                    className="px-3 py-1.5 bg-surface-raised hover:bg-surface-hover border border-border-default rounded-xl text-xs font-medium text-text-secondary flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-accent-primary" />
                    CSV Sample Template
                  </button>

                  <button
                    onClick={() => setShowPasteModal(true)}
                    className="px-3 py-1.5 bg-surface-raised hover:bg-surface-hover border border-border-default rounded-xl text-xs font-medium text-text-secondary flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5 text-emerald-500" />
                    Paste from Excel
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-surface-raised hover:bg-surface-hover border border-border-default rounded-xl text-xs font-medium text-text-secondary flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-indigo-500" />
                    Upload CSV File
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".csv"
                    className="hidden"
                  />
                </div>

                <button
                  onClick={() => {
                    const valid = rows.filter((r) => r.medicineName?.trim());
                    if (valid.length === 0) {
                      alert('Please enter at least one medicine with a name.');
                      return;
                    }
                    importMutation.mutate(valid);
                  }}
                  disabled={importMutation.isPending}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {importMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Commit Opening Stock ({openingStats.totalItems})
                </button>
              </div>

              {/* Status Alert Banner */}
              {resultStatus && (
                <div
                  className={'p-4 rounded-2xl flex items-start gap-3 border shadow-sm ' +
                    (resultStatus.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300'
                      : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300')}
                >
                  {resultStatus.success ? (
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs flex-1">
                    <p className="font-semibold">{resultStatus.message}</p>
                    {resultStatus.summary && (
                      <p className="mt-1 text-[11px] opacity-90">
                        Imported {resultStatus.summary.importedCount || resultStatus.summary.count || 0} batches successfully into inventory.
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setResultStatus(null)}
                    className="text-xs font-bold hover:underline opacity-70 hover:opacity-100"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Drag & Drop Upload Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-8 border-2 border-dashed border-border-default rounded-3xl bg-surface-base/50 hover:bg-surface-raised/40 transition text-center cursor-pointer space-y-2 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-surface-raised border border-border-default flex items-center justify-center mx-auto text-accent-primary group-hover:scale-110 transition">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-sm text-text-primary">
                  Drop your CSV file here or click to browse
                </h3>
                <p className="text-xs text-text-muted max-w-md mx-auto">
                  Supports .csv spreadsheets with Medicine Name, SKU, Batch, Expiry, Qty, Cost, and MRP columns.
                </p>
              </div>

              {/* Live Opening Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-surface-base p-4 rounded-2xl border border-border-default shadow-sm">
                  <span className="text-[11px] text-text-muted font-medium">Valid Items</span>
                  <h4 className="text-lg font-bold font-mono text-text-primary mt-1">
                    {openingStats.totalItems} Medicines
                  </h4>
                  <span className="text-[10px] text-slate-400">{rows.length} total rows in table</span>
                </div>

                <div className="bg-surface-base p-4 rounded-2xl border border-border-default shadow-sm">
                  <span className="text-[11px] text-text-muted font-medium">Total Quantity</span>
                  <h4 className="text-lg font-bold font-mono text-accent-primary mt-1">
                    {openingStats.totalUnits} Units
                  </h4>
                  <span className="text-[10px] text-slate-400">Total batch units</span>
                </div>

                <div className="bg-surface-base p-4 rounded-2xl border border-border-default shadow-sm">
                  <span className="text-[11px] text-text-muted font-medium">Total Cost Investment</span>
                  <h4 className="text-lg font-bold font-mono text-text-primary mt-1">
                    {formatCurrency(openingStats.totalCost)}
                  </h4>
                  <span className="text-[10px] text-slate-400">Inventory cost value</span>
                </div>

                <div className="bg-surface-base p-4 rounded-2xl border border-border-default shadow-sm">
                  <span className="text-[11px] text-text-muted font-medium">Total MRP Valuation</span>
                  <h4 className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    {formatCurrency(openingStats.totalMrp)}
                  </h4>
                  <span className="text-[10px] text-emerald-600 font-medium">
                    Est. Margin: {formatCurrency(openingStats.potentialProfit)}
                  </span>
                </div>
              </div>

              {/* Editable Live Opening Grid */}
              <div className="bg-surface-base rounded-2xl border border-border-default shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs text-text-primary flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-accent-primary" />
                    Live Opening Stock Entry Grid
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => addRow(1)}
                      className="px-2.5 py-1 bg-surface-raised hover:bg-surface-hover border border-border-default text-text-primary rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Row
                    </button>
                    <button
                      onClick={() => addRow(5)}
                      className="px-2.5 py-1 bg-surface-raised hover:bg-surface-hover border border-border-default text-text-primary rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> +5 Rows
                    </button>
                    <button
                      onClick={() => setRows([{ ...initialRow }, { ...initialRow }, { ...initialRow }])}
                      className="px-2.5 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Clear Grid
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[950px]">
                    <thead className="bg-surface-raised text-text-muted font-semibold border-b border-border-default text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-2 w-8">#</th>
                        <th className="py-2 px-2 min-w-[180px]">Medicine Name *</th>
                        <th className="py-2 px-2 min-w-[90px]">SKU / Barcode</th>
                        <th className="py-2 px-2 min-w-[110px]">Batch Number *</th>
                        <th className="py-2 px-2 min-w-[110px]">Expiry Date</th>
                        <th className="py-2 px-2 min-w-[70px] text-center">Qty</th>
                        <th className="py-2 px-2 min-w-[85px] text-right">Cost (₹)</th>
                        <th className="py-2 px-2 min-w-[85px] text-right">Selling (₹)</th>
                        <th className="py-2 px-2 min-w-[85px] text-right">MRP (₹)</th>
                        <th className="py-2 px-2 min-w-[90px]">Location</th>
                        <th className="py-2 px-2 w-8 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default">
                      {rows.map((r, i) => (
                        <tr key={i} className="hover:bg-surface-raised/40">
                          <td className="py-2 px-2 font-mono text-text-muted text-center">{i + 1}</td>
                          <td className="py-1 px-2">
                            <input
                              type="text"
                              placeholder="e.g. Paracetamol 650mg"
                              value={r.medicineName}
                              onChange={(e) => handleRowChange(i, 'medicineName', e.target.value)}
                              className="w-full bg-surface-page border border-border-default text-text-primary px-2 py-1 rounded-lg text-xs focus:outline-none focus:border-accent-primary"
                            />
                          </td>
                          <td className="py-1 px-2">
                            <input
                              type="text"
                              placeholder="SKU"
                              value={r.sku}
                              onChange={(e) => handleRowChange(i, 'sku', e.target.value)}
                              className="w-full bg-surface-page border border-border-default text-text-primary px-2 py-1 rounded-lg text-xs font-mono focus:outline-none"
                            />
                          </td>
                          <td className="py-1 px-2">
                            <input
                              type="text"
                              placeholder="B2026-01"
                              value={r.batchNumber}
                              onChange={(e) => handleRowChange(i, 'batchNumber', e.target.value)}
                              className="w-full bg-surface-page border border-border-default text-text-primary px-2 py-1 rounded-lg text-xs font-mono focus:outline-none"
                            />
                          </td>
                          <td className="py-1 px-2">
                            <input
                              type="date"
                              value={r.expiryDate}
                              onChange={(e) => handleRowChange(i, 'expiryDate', e.target.value)}
                              className="w-full bg-surface-page border border-border-default text-text-primary px-2 py-1 rounded-lg text-xs focus:outline-none"
                            />
                          </td>
                          <td className="py-1 px-2">
                            <input
                              type="number"
                              min="1"
                              value={r.qty}
                              onChange={(e) => handleRowChange(i, 'qty', e.target.value)}
                              className="w-full bg-surface-page border border-border-default text-text-primary px-2 py-1 rounded-lg text-xs text-center font-mono focus:outline-none"
                            />
                          </td>
                          <td className="py-1 px-2">
                            <input
                              type="number"
                              step="0.01"
                              value={r.purchasePrice}
                              onChange={(e) => handleRowChange(i, 'purchasePrice', e.target.value)}
                              className="w-full bg-surface-page border border-border-default text-text-primary px-2 py-1 rounded-lg text-xs text-right font-mono focus:outline-none"
                            />
                          </td>
                          <td className="py-1 px-2">
                            <input
                              type="number"
                              step="0.01"
                              value={r.sellingPrice}
                              onChange={(e) => handleRowChange(i, 'sellingPrice', e.target.value)}
                              className="w-full bg-surface-page border border-border-default text-text-primary px-2 py-1 rounded-lg text-xs text-right font-mono focus:outline-none"
                            />
                          </td>
                          <td className="py-1 px-2">
                            <input
                              type="number"
                              step="0.01"
                              value={r.mrp}
                              onChange={(e) => handleRowChange(i, 'mrp', e.target.value)}
                              className="w-full bg-surface-page border border-border-default text-text-primary px-2 py-1 rounded-lg text-xs text-right font-mono focus:outline-none"
                            />
                          </td>
                          <td className="py-1 px-2">
                            <input
                              type="text"
                              placeholder="Rack-A"
                              value={r.rackLocation}
                              onChange={(e) => handleRowChange(i, 'rackLocation', e.target.value)}
                              className="w-full bg-surface-page border border-border-default text-text-primary px-2 py-1 rounded-lg text-xs focus:outline-none"
                            />
                          </td>
                          <td className="py-1 px-2 text-center">
                            <button
                              onClick={() => removeRow(i)}
                              className="p-1 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 rounded transition"
                              title="Delete Row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Opening Stock Imports History */}
              <div className="bg-surface-base rounded-2xl border border-border-default shadow-sm p-4 space-y-3">
                <h3 className="font-bold text-xs text-text-primary flex items-center gap-1.5">
                  <History className="w-4 h-4 text-text-muted" />
                  Recent Opening Stock Import Batches
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[650px]">
                    <thead className="bg-surface-raised text-text-muted font-semibold border-b border-border-default text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Medicine</th>
                        <th className="py-2 px-3">Batch #</th>
                        <th className="py-2 px-3 text-center">Opening Qty</th>
                        <th className="py-2 px-3 text-right">Cost Rate (₹)</th>
                        <th className="py-2 px-3 text-right">MRP (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default">
                      {loadingRecent ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400">
                            Loading import records...
                          </td>
                        </tr>
                      ) : (recentImports || []).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400">
                            No opening stock batches imported recently for this branch.
                          </td>
                        </tr>
                      ) : (
                        recentImports.slice(0, 10).map((b: any, idx: number) => (
                          <tr key={idx} className="hover:bg-surface-raised/40">
                            <td className="py-2 px-3 text-text-muted font-mono">{formatDate(b.createdAt)}</td>
                            <td className="py-2 px-3 font-semibold text-text-primary">
                              {b.medicine?.name || b.medicineName || 'Medicine'}
                            </td>
                            <td className="py-2 px-3 font-mono text-accent-primary">{b.batchNumber}</td>
                            <td className="py-2 px-3 text-center font-bold font-mono text-text-primary">
                              {b.initialQty || b.currentQty}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-text-secondary">
                              {formatCurrency(b.purchasePrice)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(b.mrp)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: CLOSING STOCK (EXPORT & LIVE REGISTER) */}
          {/* ========================================================================= */}
          {activeTab === 'closing' && (
            <div className="space-y-6">
              {/* Closing Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-surface-base p-4 rounded-2xl border border-border-default shadow-sm">
                  <span className="text-[11px] text-text-muted font-medium">Closing Items</span>
                  <h4 className="text-lg font-bold font-mono text-text-primary mt-1">
                    {closingTotals.totalItems} Batches
                  </h4>
                  <span className="text-[10px] text-slate-400">{closingStockData?.summary?.totalMedicines || 0} distinct medicines</span>
                </div>

                <div className="bg-surface-base p-4 rounded-2xl border border-border-default shadow-sm">
                  <span className="text-[11px] text-text-muted font-medium">Physical Stock on Shelf</span>
                  <h4 className="text-lg font-bold font-mono text-accent-primary mt-1">
                    {closingTotals.totalQty} Units
                  </h4>
                  <span className="text-[10px] text-slate-400">Available sellable inventory</span>
                </div>

                <div className="bg-surface-base p-4 rounded-2xl border border-border-default shadow-sm">
                  <span className="text-[11px] text-text-muted font-medium">Total Cost Valuation</span>
                  <h4 className="text-lg font-bold font-mono text-text-primary mt-1">
                    {formatCurrency(closingTotals.totalPurchaseValue)}
                  </h4>
                  <span className="text-[10px] text-slate-400">Purchase investment value</span>
                </div>

                <div className="bg-surface-base p-4 rounded-2xl border border-border-default shadow-sm">
                  <span className="text-[11px] text-text-muted font-medium">Total MRP Retail Value</span>
                  <h4 className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    {formatCurrency(closingTotals.totalMrpValue)}
                  </h4>
                  <span className="text-[10px] text-emerald-600 font-semibold">
                    Potential Margin: {formatCurrency(closingTotals.grossMargin)} ({closingTotals.marginPct}%)
                  </span>
                </div>
              </div>

              {/* Filters & Export Options Bar */}
              <div className="print:hidden flex flex-wrap items-center justify-between gap-3 bg-surface-base p-4 rounded-2xl border border-border-default shadow-sm">
                {/* Search & Category Filter */}
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search medicine name, generic formula, SKU, batch..."
                      value={closingSearch}
                      onChange={(e) => setClosingSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-surface-page border border-border-default rounded-xl text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                    />
                  </div>

                  {categoriesList.length > 0 && (
                    <select
                      value={closingCategory}
                      onChange={(e) => setClosingCategory(e.target.value)}
                      className="bg-surface-page border border-border-default text-text-primary px-3 py-1.5 rounded-xl text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">All Categories</option>
                      {categoriesList.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Export Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={exportClosingExcel}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition active:scale-95 cursor-pointer"
                    title="Export Closing Stock to Microsoft Excel Spreadsheet (.xlsx)"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Excel (.xlsx)
                  </button>

                  <button
                    onClick={exportClosingCSV}
                    className="px-3.5 py-1.5 bg-surface-raised hover:bg-surface-hover border border-border-default text-text-primary rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                    title="Export Closing Stock to CSV Data File (.csv)"
                  >
                    <FileText className="w-3.5 h-3.5 text-accent-primary" />
                    Export CSV (.csv)
                  </button>

                  <button
                    onClick={handlePrintPDF}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow transition active:scale-95 cursor-pointer"
                    title="Print Closing Stock or Save as PDF via Browser Print"
                  >
                    <Printer className="w-3.5 h-3.5 text-sky-400" />
                    Print / PDF
                  </button>
                </div>
              </div>

              {/* Comprehensive Closing Stock Table */}
              <div className="bg-surface-base rounded-2xl border border-border-default shadow-sm overflow-hidden p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs text-text-primary flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-accent-primary" />
                    Current Closing Stock &amp; Physical Inventory Register ({filteredClosingBatches.length} items)
                  </h3>
                  <span className="text-[11px] text-text-muted font-mono">
                    Valuation: <b>{formatCurrency(closingTotals.totalPurchaseValue)}</b> (Cost) | <b>{formatCurrency(closingTotals.totalMrpValue)}</b> (MRP)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[850px]">
                    <thead className="bg-surface-raised text-text-muted font-semibold border-b border-border-default text-[10px] uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Medicine &amp; Generic Formula</th>
                        <th className="py-2.5 px-3">SKU</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Batch Number</th>
                        <th className="py-2.5 px-3">Expiry Date</th>
                        <th className="py-2.5 px-3 text-center">Closing Qty</th>
                        <th className="py-2.5 px-3 text-right">Cost Rate (₹)</th>
                        <th className="py-2.5 px-3 text-right">MRP (₹)</th>
                        <th className="py-2.5 px-3 text-right">Cost Value (₹)</th>
                        <th className="py-2.5 px-3 text-right">MRP Value (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default">
                      {loadingBatches || loadingClosing ? (
                        <tr>
                          <td colSpan={10} className="py-12 text-center text-slate-400">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                            Calculating live closing stock balances...
                          </td>
                        </tr>
                      ) : filteredClosingBatches.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-12 text-center text-slate-400">
                            No closing stock matches found. Check search filters or import initial opening stock.
                          </td>
                        </tr>
                      ) : (
                        filteredClosingBatches.map((item, idx) => {
                          const isExpired = item.expiryDate && new Date(item.expiryDate) < new Date();
                          return (
                            <tr key={idx} className="hover:bg-surface-raised/40">
                              <td className="py-2 px-3">
                                <div className="font-bold text-text-primary">{item.medicineName}</div>
                                {item.genericName && (
                                  <div className="text-[10px] text-slate-400">{item.genericName}</div>
                                )}
                              </td>
                              <td className="py-2 px-3 font-mono text-[11px] text-text-muted">{item.sku}</td>
                              <td className="py-2 px-3 text-text-secondary">{item.category}</td>
                              <td className="py-2 px-3 font-mono font-bold text-accent-primary">
                                {item.batchNumber}
                              </td>
                              <td className="py-2 px-3 font-mono text-text-muted">
                                {item.expiryDate ? (
                                  <span className={isExpired ? 'text-red-500 font-bold' : ''}>
                                    {formatDate(item.expiryDate)}
                                    {isExpired && ' (EXPIRED)'}
                                  </span>
                                ) : (
                                  'N/A'
                                )}
                              </td>
                              <td className="py-2 px-3 text-center font-mono font-bold text-text-primary">
                                {item.currentQty} <span className="text-[10px] text-text-muted font-normal">{item.unit}</span>
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-text-secondary">
                                {formatCurrency(item.purchasePrice)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(item.mrp)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-text-primary">
                                {formatCurrency(item.purchaseValuation)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(item.mrpValuation)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Paste from Excel Modal */}
          {showPasteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-surface-base border border-border-default rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                    <ClipboardPaste className="w-5 h-5 text-emerald-500" />
                    Paste Tab-Separated Data from Excel
                  </h3>
                  <button
                    onClick={() => setShowPasteModal(false)}
                    className="text-text-muted hover:text-text-primary text-xs font-bold"
                  >
                    Close
                  </button>
                </div>

                <p className="text-xs text-text-muted">
                  Copy rows directly from Microsoft Excel or Google Sheets and paste below. Expected column order:
                  <br />
                  <b className="font-mono text-accent-primary">
                    [Name] [SKU] [Batch] [Expiry] [Qty] [Cost] [Selling] [MRP] [GST%] [Location]
                  </b>
                </p>

                <textarea
                  rows={8}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste your copied Excel table rows here..."
                  className="w-full bg-surface-page border border-border-default rounded-2xl p-3 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-primary"
                />

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowPasteModal(false)}
                    className="px-4 py-2 bg-surface-raised text-text-muted rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePasteProcess}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow"
                  >
                    Process &amp; Load into Grid
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
