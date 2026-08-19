'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';

import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { apiClient } from '../../lib/api-client';
import { formatCurrency } from '@medical-inventory/shared-utils';

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstNumber: '',
    drugLicense: '',
    address: '',
    city: '',
    state: '',
    pinZip: '',
  });

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['suppliers-list', search],
    queryFn: async () => {
      const res = await apiClient.get('/suppliers', {
        params: { search: search || undefined },
      });
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
  });

  const supplierMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingSupplier) {
        return apiClient.patch(`/suppliers/${editingSupplier.id}`, payload);
      }
      return apiClient.post('/suppliers', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers-list'] });
      setShowModal(false);
      setEditingSupplier(null);
    },
  });

  const handleOpenCreate = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      gstNumber: '',
      drugLicense: '',
      address: '',
      city: '',
      state: '',
      pinZip: '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (sup: any) => {
    setEditingSupplier(sup);
    setFormData({
      name: sup.name,
      contactPerson: sup.contactPerson || '',
      phone: sup.phone,
      email: sup.email || '',
      gstNumber: sup.gstNumber || '',
      drugLicense: sup.drugLicense || '',
      address: sup.address || '',
      city: sup.city || '',
      state: sup.state || '',
      pinZip: sup.pinZip || '',
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    supplierMutation.mutate(formData);
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Suppliers & Distributors</h2>
              <p className="text-xs text-slate-500">
                Manage vendor details, GST credentials, drug licenses, and outstanding payable balances.
              </p>
            </div>

            <button
              onClick={handleOpenCreate}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-sky-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Supplier
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
                placeholder="Search Supplier Name, Contact Person, or Phone..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Suppliers Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Supplier / Firm Name</th>
                    <th className="py-3 px-4">Contact Person</th>
                    <th className="py-3 px-4">Phone / Email</th>
                    <th className="py-3 px-4">GST / License</th>
                    <th className="py-3 px-4 text-right">Outstanding Balance</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Loading suppliers...
                      </td>
                    </tr>
                  ) : (Array.isArray(suppliers) ? suppliers : []).map((sup: any) => (
                    <tr key={sup.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{sup.name}</td>
                      <td className="py-3 px-4 text-slate-700">{sup.contactPerson || '—'}</td>
                      <td className="py-3 px-4 text-slate-600 font-mono">
                        <div>{sup.phone}</div>
                        {sup.email && <div className="text-[10px] text-slate-400">{sup.email}</div>}
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-600">
                        <div>GST: {sup.gstNumber || 'N/A'}</div>
                        <div>DL: {sup.drugLicense || 'N/A'}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        <span className={sup.currentBalance > 0 ? 'text-amber-700' : 'text-slate-700'}>
                          {formatCurrency(sup.currentBalance || 0)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenEdit(sup)}
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

        {/* Create / Edit Supplier Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="font-bold text-sm text-slate-900">
                  {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Firm / Agency Name *</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Contact Person</label>
                    <input
                      type="text"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                    <input
                      required
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">GST Number</label>
                    <input
                      type="text"
                      value={formData.gstNumber}
                      onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Drug License #</label>
                    <input
                      type="text"
                      value={formData.drugLicense}
                      onChange={(e) => setFormData({ ...formData, drugLicense: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
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
                    disabled={supplierMutation.isPending}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl shadow"
                  >
                    {supplierMutation.isPending ? 'Saving...' : 'Save Supplier'}
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
