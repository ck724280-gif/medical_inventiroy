'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wallet,
  Plus,
  Filter,
  TrendingDown,
  X,
  Search,
  Printer,
  Edit2,
  Trash2,
  Calendar,
  CreditCard,
  Building2,
  Receipt,
  FileText,
  Save,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Lock,
} from 'lucide-react';

import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { ExpenseCategory, PaymentMode } from '@medical-inventory/shared-types';
import { formatDate, formatDateTime, formatCurrency } from '@medical-inventory/shared-utils';

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const { selectedBranchId, isSuperAdmin, hasPermission } = useAuthStore();
  const canManage = isSuperAdmin() || hasPermission('expense.create') || hasPermission('expense.edit');
  const canDelete = isSuperAdmin() || hasPermission('expense.delete') || hasPermission('expense.edit');

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);

  // Voucher Print Modal
  const [activeVoucher, setActiveVoucher] = useState<any | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    payeeName: string;
    payeePhone: string;
    voucherNumber: string;
    category: string;
    amount: string;
    date: string;
    paymentMethod: string;
    utrNumber: string;
    notes: string;
  }>({
    payeeName: '',
    payeePhone: '',
    voucherNumber: '',
    category: 'MISCELLANEOUS',
    amount: '',
    date: new Date().toISOString().slice(0, 16),
    paymentMethod: 'CASH',
    utrNumber: '',
    notes: '',
  });

  const { data: expensesData, isLoading, refetch } = useQuery({
    queryKey: ['expenses-list', selectedBranchId, selectedCategory, search],
    queryFn: async () => {
      const res = await apiClient.get('/expenses', {
        params: {
          branchId: selectedBranchId || undefined,
          category: selectedCategory || undefined,
          search: search || undefined,
          limit: 100,
        },
      });
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
  });

  const expenses = Array.isArray(expensesData) ? expensesData : [];

  // Summary KPI Calculations
  const totalAmount = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayAmount = expenses
    .filter((exp) => exp.date && exp.date.startsWith(todayStr))
    .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  const cashAmount = expenses
    .filter((exp) => (exp.paymentMethod || '').toUpperCase() === 'CASH')
    .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  const onlineAmount = expenses
    .filter((exp) => (exp.paymentMethod || '').toUpperCase() !== 'CASH')
    .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

  const expenseMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingExpense) {
        return apiClient.patch(`/expenses/${editingExpense.id}`, payload);
      }
      return apiClient.post('/expenses', {
        ...payload,
        branchId: selectedBranchId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-list'] });
      setShowModal(false);
      setEditingExpense(null);
      refetch();
      alert(editingExpense ? 'Expense record updated!' : 'Expense recorded successfully!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to save expense record.');
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-list'] });
      refetch();
      alert('Expense entry deleted.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete expense entry.');
    },
  });

  const handleOpenCreate = () => {
    setEditingExpense(null);
    const localISOTime = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setFormData({
      payeeName: '',
      payeePhone: '',
      voucherNumber: `VCH-${Date.now().toString().slice(-6)}`,
      category: 'MISCELLANEOUS',
      amount: '',
      date: localISOTime,
      paymentMethod: 'CASH',
      utrNumber: '',
      notes: '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (exp: any) => {
    setEditingExpense(exp);
    const localDate = new Date(exp.date);
    const localISOTime = new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setFormData({
      payeeName: exp.payeeName || '',
      payeePhone: exp.payeePhone || '',
      voucherNumber: exp.voucherNumber || '',
      category: exp.category || 'MISCELLANEOUS',
      amount: String(exp.amount || ''),
      date: localISOTime,
      paymentMethod: exp.paymentMethod || 'CASH',
      utrNumber: exp.utrNumber || '',
      notes: exp.description || exp.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = (exp: any) => {
    if (confirm(`Are you sure you want to delete expense record of ₹${exp.amount} paid to "${exp.payeeName || 'N/A'}"?`)) {
      deleteExpenseMutation.mutate(exp.id);
    }
  };

  const handlePrintVoucher = async (id: string) => {
    try {
      const res = await apiClient.get(`/expenses/${id}/voucher`);
      setActiveVoucher(res.data?.data || res.data);
    } catch (e) {
      alert('Failed to generate expense voucher.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      alert('Please enter a valid expense amount');
      return;
    }
    expenseMutation.mutate({
      ...formData,
      amount: parseFloat(formData.amount),
    });
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-200">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <main className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-5">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                  Business Expenses &amp; Payouts
                </h2>
                {canManage && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Master Ledger
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Record and audit operational expenses, payee details, UTR numbers, payment dates, and cash/bank debit vouchers.
              </p>
            </div>

            {canManage && (
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg transition cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Record Expense / Payout
              </button>
            )}
          </div>

          {/* Top KPI Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Expenses (Filtered)</p>
                <p className="text-xl font-black text-red-600 dark:text-red-400 font-mono mt-0.5">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Today&apos;s Payouts</p>
                <p className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
                  {formatCurrency(todayAmount)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Cash Payouts</p>
                <p className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                  {formatCurrency(cashAmount)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">UPI / Bank Payouts</p>
                <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                  {formatCurrency(onlineAmount)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] shadow-sm flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[240px] relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Payee Name, UTR Number, Voucher #, or Notes..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
              />
            </div>

            <div className="w-full sm:w-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-sky-500 font-medium"
              >
                <option value="">All Categories</option>
                <option value="STORE_RENT">STORE RENT</option>
                <option value="ELECTRICITY_WATER">ELECTRICITY &amp; WATER BILLS</option>
                <option value="STAFF_SALARY">STAFF SALARY &amp; ADVANCE</option>
                <option value="TEA_REFRESHMENT">TEA, SNACKS &amp; REFRESHMENT</option>
                <option value="CLEANING_HOUSEKEEPING">CLEANING &amp; HOUSEKEEPING</option>
                <option value="PACKAGING_STATIONERY">PACKAGING, BAGS &amp; STATIONERY</option>
                <option value="EQUIPMENT_REPAIR">EQUIPMENT &amp; REPAIR MAINTENANCE</option>
                <option value="SOFTWARE_IT">SOFTWARE, INTERNET &amp; IT</option>
                <option value="TRANSPORT_COURIER">TRANSPORT &amp; COURIER</option>
                <option value="TAX_LICENSE_FEES">GOVERNMENT TAX &amp; LICENSE FEES</option>
                <option value="MISCELLANEOUS">MISCELLANEOUS</option>
              </select>
            </div>
          </div>

          {/* Master Expenses Table */}
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs min-w-[850px]">
                <thead className="bg-slate-100/80 dark:bg-[#0c1322] text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Date &amp; Time</th>
                    <th className="py-3 px-4">Voucher #</th>
                    <th className="py-3 px-4">Paid To (Payee)</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Payment Mode &amp; UTR</th>
                    <th className="py-3 px-4">Description / Purpose</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        Loading expenses...
                      </td>
                    </tr>
                  ) : expenses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        No expense records found. Click &quot;Record Expense / Payout&quot; to add one.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((exp: any) => (
                      <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                          <div>{formatDate(exp.date)}</div>
                          <div className="text-[10px] text-slate-400">
                            {formatDateTime(exp.date).split(' ').slice(1).join(' ')}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-sky-600 dark:text-sky-400">
                          {exp.voucherNumber || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">{exp.payeeName || '—'}</div>
                          {exp.payeePhone && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                              {exp.payeePhone}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {exp.category?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                            <CreditCard className="w-3 h-3 text-slate-400" />
                            {exp.paymentMethod || 'CASH'}
                          </div>
                          {exp.utrNumber && (
                            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                              UTR: {exp.utrNumber}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                          {exp.description || '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-red-600 dark:text-red-400 text-sm">
                          {formatCurrency(exp.amount || 0)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handlePrintVoucher(exp.id)}
                              title="Print Debit Payment Voucher"
                              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {canManage && (
                              <button
                                onClick={() => handleOpenEdit(exp)}
                                title="Edit Expense"
                                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDelete(exp)}
                                title="Delete Expense"
                                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {/* Modal: Create / Edit Expense */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full p-6 space-y-4 text-xs overflow-y-auto max-h-[90vh] shadow-2xl text-slate-900 dark:text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
                  <Wallet className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {editingExpense ? 'Edit Business Expense' : 'Record New Expense / Payout'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Paid To (Payee / Vendor / Staff) *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Ramesh Electrician / BESCOM"
                      value={formData.payeeName}
                      onChange={(e) => setFormData({ ...formData, payeeName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Payee Mobile Number
                    </label>
                    <input
                      type="tel"
                      placeholder="9876543210"
                      value={formData.payeePhone}
                      onChange={(e) => setFormData({ ...formData, payeePhone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl font-mono text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Expense Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="STORE_RENT">STORE RENT</option>
                      <option value="ELECTRICITY_WATER">ELECTRICITY &amp; WATER BILLS</option>
                      <option value="STAFF_SALARY">STAFF SALARY &amp; ADVANCE</option>
                      <option value="TEA_REFRESHMENT">TEA, SNACKS &amp; REFRESHMENT</option>
                      <option value="CLEANING_HOUSEKEEPING">CLEANING &amp; HOUSEKEEPING</option>
                      <option value="PACKAGING_STATIONERY">PACKAGING, BAGS &amp; STATIONERY</option>
                      <option value="EQUIPMENT_REPAIR">EQUIPMENT &amp; REPAIR MAINTENANCE</option>
                      <option value="SOFTWARE_IT">SOFTWARE, INTERNET &amp; IT</option>
                      <option value="TRANSPORT_COURIER">TRANSPORT &amp; COURIER</option>
                      <option value="TAX_LICENSE_FEES">GOVERNMENT TAX &amp; LICENSE FEES</option>
                      <option value="MISCELLANEOUS">MISCELLANEOUS</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Expense Amount (₹) *
                    </label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl font-mono font-bold text-red-600 dark:text-red-400 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Payment Mode *
                    </label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 font-semibold"
                    >
                      <option value="CASH">CASH (Physical Cash Box)</option>
                      <option value="UPI">UPI / QR Code Scan</option>
                      <option value="BANK_TRANSFER">BANK TRANSFER (NEFT/RTGS/IMPS)</option>
                      <option value="CHEQUE">CHEQUE</option>
                      <option value="CARD">DEBIT / CREDIT CARD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      UTR / UPI Ref / Cheque #
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 423512398412 or Cheque # 001248"
                      value={formData.utrNumber}
                      onChange={(e) => setFormData({ ...formData, utrNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl font-mono text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Voucher / Bill #
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. VCH-001248 or EB-AUG-26"
                      value={formData.voucherNumber}
                      onChange={(e) => setFormData({ ...formData, voucherNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl font-mono text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Payment Date &amp; Time *
                    </label>
                    <input
                      required
                      type="datetime-local"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl font-mono text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Description / Purpose Remarks
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Detailed reason for expenditure..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 resize-none"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={expenseMutation.isPending}
                    className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 font-bold text-white shadow-lg transition active:scale-95"
                  >
                    {expenseMutation.isPending
                      ? 'Saving...'
                      : editingExpense
                      ? 'Update Expense'
                      : 'Record & Save Voucher'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Printable Payment Voucher Modal */}
        {activeVoucher && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 space-y-4 shadow-2xl text-slate-900 dark:text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold">
                  <Receipt className="w-5 h-5" />
                  <h3>Debit Payment Voucher</h3>
                </div>
                <button
                  onClick={() => setActiveVoucher(null)}
                  className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Printable Voucher Paper */}
              <div
                id="expense-voucher-print"
                className="p-5 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl space-y-4 font-mono text-xs"
              >
                <div className="text-center border-b border-dashed border-slate-300 dark:border-slate-700 pb-3">
                  <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    {activeVoucher.storeName}
                  </h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{activeVoucher.storeAddress}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Phone: {activeVoucher.storePhone} {activeVoucher.gstNumber && `| GST: ${activeVoucher.gstNumber}`}
                  </p>
                  <div className="inline-block mt-1 px-2.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded text-[10px] font-bold tracking-widest uppercase">
                    {activeVoucher.headerText}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">VOUCHER NUMBER</span>
                    <span className="font-bold text-sky-600 dark:text-sky-400">{activeVoucher.voucherNumber}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">DATE &amp; TIME</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {activeVoucher.date} {activeVoucher.time}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 border-t border-b border-slate-200 dark:border-slate-800 py-3 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">PAID TO:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{activeVoucher.paidTo}</span>
                  </div>
                  {activeVoucher.payeePhone !== 'N/A' && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">CONTACT:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{activeVoucher.payeePhone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">CATEGORY:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {activeVoucher.category?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">PAYMENT MODE:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{activeVoucher.paymentMethod}</span>
                  </div>
                  {activeVoucher.utrNumber !== 'N/A' && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">UTR / REF #:</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {activeVoucher.utrNumber}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">PURPOSE:</span>
                    <span className="text-slate-700 dark:text-slate-300 max-w-[240px] text-right truncate">
                      {activeVoucher.description}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800/80 p-3 rounded-lg">
                  <span className="font-black text-slate-700 dark:text-slate-300 text-xs">TOTAL PAID AMOUNT:</span>
                  <span className="font-mono font-black text-base text-red-600 dark:text-red-400">
                    {formatCurrency(activeVoucher.amount)}
                  </span>
                </div>

                <div className="pt-6 grid grid-cols-2 gap-4 text-[10px] text-slate-500 dark:text-slate-400">
                  <div className="border-t border-dashed border-slate-300 dark:border-slate-700 pt-1 text-center">
                    Receiver&apos;s Signature
                  </div>
                  <div className="border-t border-dashed border-slate-300 dark:border-slate-700 pt-1 text-center">
                    Authorized Signatory
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveVoucher(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const printContents = document.getElementById('expense-voucher-print')?.innerHTML;
                    const win = window.open('', '_blank');
                    if (win && printContents) {
                      win.document.write(`
                        <html>
                          <head>
                            <title>Expense Voucher - ${activeVoucher.voucherNumber}</title>
                            <style>
                              body { font-family: monospace; padding: 20px; font-size: 12px; }
                              .border-b { border-bottom: 1px dashed #ccc; padding-bottom: 10px; margin-bottom: 10px; }
                              .flex { display: flex; justify-content: space-between; margin: 4px 0; }
                              .bold { font-weight: bold; }
                              .text-center { text-align: center; }
                              .total-box { border: 1px solid #000; padding: 8px; font-size: 14px; font-weight: bold; margin: 12px 0; }
                              .sig-grid { display: flex; justify-content: space-between; margin-top: 40px; }
                              .sig-line { border-top: 1px dashed #000; width: 40%; text-align: center; padding-top: 4px; font-size: 10px; }
                            </style>
                          </head>
                          <body onload="window.print();window.close();">
                            ${printContents}
                          </body>
                        </html>
                      `);
                      win.document.close();
                    }
                  }}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 font-bold text-white shadow-lg transition flex items-center gap-1.5 active:scale-95"
                >
                  <Printer className="w-4 h-4" /> Print Voucher Slip
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
