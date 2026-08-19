'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wallet,
  Plus,
  Filter,
  DollarSign,
  TrendingDown,
  X,
} from 'lucide-react';

import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { ExpenseCategory, PaymentMode } from '@medical-inventory/shared-types';
import { formatDate, formatCurrency } from '@medical-inventory/shared-utils';

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const { selectedBranchId } = useAuthStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    category: ExpenseCategory.RENT,
    amount: 0,
    paymentMethod: PaymentMode.CASH,
    notes: '',
  });

  const { data: expensesData, isLoading } = useQuery({
    queryKey: ['expenses-list', selectedBranchId, selectedCategory],
    queryFn: async () => {
      const res = await apiClient.get('/expenses', {
        params: {
          branchId: selectedBranchId || undefined,
          category: selectedCategory || undefined,
          limit: 50,
        },
      });
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
  });

  const expenses = Array.isArray(expensesData) ? expensesData : [];

  const expenseMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/expenses', {
        ...formData,
        branchId: selectedBranchId,
        date: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-list'] });
      setShowModal(false);
      setFormData({
        category: ExpenseCategory.RENT,
        amount: 0,
        paymentMethod: PaymentMode.CASH,
        notes: '',
      });
    },
  });

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Business Expenses</h2>
              <p className="text-xs text-slate-500">
                Track operational costs including store rent, utility bills, staff salaries, and maintenance.
              </p>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-sky-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Expense
            </button>
          </div>

          {/* Category Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-sky-500"
            >
              <option value="">All Categories</option>
              {Object.values(ExpenseCategory).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Expenses Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Logged By</th>
                    <th className="py-3 px-4">Description / Notes</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Loading expenses...
                      </td>
                    </tr>
                  ) : expenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No expenses logged for this branch.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((exp: any) => (
                      <tr key={exp.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono text-slate-500">{formatDate(exp.date)}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[10px] font-semibold text-slate-800">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">{exp.paymentMethod}</td>
                        <td className="py-3 px-4 text-slate-600">
                          {exp.createdByUser?.firstName} {exp.createdByUser?.lastName}
                        </td>
                        <td className="py-3 px-4 text-slate-500">{exp.notes || '—'}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-red-600">
                          {formatCurrency(exp.amount || 0)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {/* Expense Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="font-bold text-sm text-slate-900">Record Business Expense</h3>
                <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  expenseMutation.mutate();
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
                  >
                    {Object.values(ExpenseCategory).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount (₹) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as PaymentMode })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
                  >
                    <option value={PaymentMode.CASH}>Cash</option>
                    <option value={PaymentMode.UPI}>UPI / Bank</option>
                    <option value={PaymentMode.CARD}>Card</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Notes / Description</label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={expenseMutation.isPending}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl shadow"
                  >
                    {expenseMutation.isPending ? 'Saving...' : 'Save Expense'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
