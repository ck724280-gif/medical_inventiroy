'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  Edit2,
  X,
} from 'lucide-react';

import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { apiClient } from '../../lib/api-client';
import { formatDate } from '@medical-inventory/shared-utils';

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    address: '',
    notes: '',
  });

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers-list', search],
    queryFn: async () => {
      const res = await apiClient.get('/customers', {
        params: { search: search || undefined },
      });
      return res.data || [];
    },
  });

  const customerMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingCustomer) {
        return apiClient.patch(`/customers/${editingCustomer.id}`, payload);
      }
      return apiClient.post('/customers', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers-list'] });
      setShowModal(false);
      setEditingCustomer(null);
    },
  });

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setFormData({ name: '', mobile: '', email: '', address: '', notes: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (c: any) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      mobile: c.mobile || '',
      email: c.email || '',
      address: c.address || '',
      notes: c.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    customerMutation.mutate(formData);
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Customers & Patients</h2>
              <p className="text-xs text-slate-500">
                Patient records, contact details, and past prescription purchase history.
              </p>
            </div>

            <button
              onClick={handleOpenCreate}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-sky-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Customer
            </button>
          </div>

          {/* Search */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Patient Name or Mobile..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Customers Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Mobile Number</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Address</th>
                    <th className="py-3 px-4 text-center">Total Invoices</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Loading customer records...
                      </td>
                    </tr>
                  ) : customers?.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                      <td className="py-3 px-4 font-mono text-sky-800 font-semibold">{c.mobile || '—'}</td>
                      <td className="py-3 px-4 text-slate-600">{c.email || '—'}</td>
                      <td className="py-3 px-4 text-slate-600">{c.address || '—'}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                        {c._count?.sales || 0}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {/* Customer Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="font-bold text-sm text-slate-900">
                  {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Customer / Patient Name *</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Number</label>
                  <input
                    type="text"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Address / Landmark</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
                    disabled={customerMutation.isPending}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl shadow"
                  >
                    {customerMutation.isPending ? 'Saving...' : 'Save Customer'}
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
