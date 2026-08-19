'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Users,
  Edit2,
  X,
  MessageCircle,
  Tag,
  Trash2,
} from 'lucide-react';
import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { apiClient } from '../../lib/api-client';
import { formatCurrency, generatePaymentReminderUrl } from '@medical-inventory/shared-utils';

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);

  // Special Pricing State
  const [specialPricingCustomer, setSpecialPricingCustomer] = useState<any | null>(null);
  const [showSpecialPriceModal, setShowSpecialPriceModal] = useState(false);
  const [newSpecialPrice, setNewSpecialPrice] = useState({
    medicineId: '',
    customPrice: '',
    discountPercent: '',
  });

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    address: '',
    gstNumber: '',
    notes: '',
  });

  const { data: customersData, isLoading } = useQuery({
    queryKey: ['customers-list', search],
    queryFn: async () => {
      const res = await apiClient.get('/customers', {
        params: { search: search || undefined },
      });
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
  });

  const customers = Array.isArray(customersData) ? customersData : [];

  // Fetch medicines for special pricing
  const { data: medicinesData } = useQuery({
    queryKey: ['medicines-select'],
    queryFn: async () => {
      const res = await apiClient.get('/medicines', { params: { limit: 200 } });
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
    enabled: showSpecialPriceModal,
  });
  const medicines = Array.isArray(medicinesData) ? medicinesData : [];

  // Fetch special prices for customer
  const { data: partyPricesData, refetch: refetchPartyPrices } = useQuery({
    queryKey: ['party-prices', specialPricingCustomer?.id],
    queryFn: async () => {
      if (!specialPricingCustomer?.id) return [];
      const res = await apiClient.get('/party-pricing', {
        params: { customerId: specialPricingCustomer.id },
      });
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
    enabled: !!specialPricingCustomer?.id,
  });
  const partyPrices = Array.isArray(partyPricesData) ? partyPricesData : [];

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

  const specialPriceMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/party-pricing', {
        ...payload,
        partyType: 'CUSTOMER',
        customerId: specialPricingCustomer.id,
      });
    },
    onSuccess: () => {
      refetchPartyPrices();
      setNewSpecialPrice({ medicineId: '', customPrice: '', discountPercent: '' });
    },
  });

  const deleteSpecialPriceMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/party-pricing/${id}`);
    },
    onSuccess: () => {
      refetchPartyPrices();
    },
  });

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setFormData({ name: '', mobile: '', email: '', address: '', gstNumber: '', notes: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (c: any) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      mobile: c.mobile || '',
      email: c.email || '',
      address: c.address || '',
      gstNumber: c.gstNumber || '',
      notes: c.notes || '',
    });
    setShowModal(true);
  };

  const handleOpenSpecialPricing = (c: any) => {
    setSpecialPricingCustomer(c);
    setShowSpecialPriceModal(true);
  };

  const handleWhatsAppReminder = (c: any) => {
    if (!c.mobile) {
      alert('Customer mobile number is missing');
      return;
    }
    const balance = c.currentBalance || c.balance || 0;
    const url = generatePaymentReminderUrl(c.mobile, c.name, balance);
    window.open(url, '_blank');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    customerMutation.mutate(formData);
  };

  const handleAddSpecialPrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpecialPrice.medicineId) return;
    specialPriceMutation.mutate({
      medicineId: newSpecialPrice.medicineId,
      customPrice: newSpecialPrice.customPrice ? Number(newSpecialPrice.customPrice) : 0,
      discountPercent: newSpecialPrice.discountPercent ? Number(newSpecialPrice.discountPercent) : 0,
    });
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
                Patient records, party special pricing matrix, and WhatsApp balance reminders.
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
                    <th className="py-3 px-4">GST / Address</th>
                    <th className="py-3 px-4 text-right">Outstanding Balance</th>
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
                  ) : customers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No customer records found.
                      </td>
                    </tr>
                  ) : (
                    customers.map((c: any) => {
                      const balance = c.currentBalance || c.balance || 0;
                      return (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                          <td className="py-3 px-4 font-mono text-sky-800 font-semibold">{c.mobile || '—'}</td>
                          <td className="py-3 px-4 text-slate-600">
                            {c.gstNumber && <span className="font-mono text-[10px] text-sky-700 block">GST: {c.gstNumber}</span>}
                            <span>{c.address || '—'}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold">
                            <span className={balance > 0 ? 'text-amber-700 font-semibold' : 'text-slate-700'}>
                              {formatCurrency(balance)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                            {c._count?.sales || 0}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {balance > 0 && c.mobile && (
                                <button
                                  onClick={() => handleWhatsAppReminder(c)}
                                  title="Send WhatsApp Payment Reminder"
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenSpecialPricing(c)}
                                title="Special Pricing Matrix"
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              >
                                <Tag className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenEdit(c)}
                                title="Edit Customer"
                                className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
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
                  <label className="block font-semibold text-slate-700 mb-1">GSTIN Number (for B2B)</label>
                  <input
                    type="text"
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                    placeholder="27AABCU9603R1ZM"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:outline-none focus:border-sky-500"
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

        {/* Special Pricing Matrix Modal (R4) */}
        {showSpecialPriceModal && specialPricingCustomer && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Special Prices: {specialPricingCustomer.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Auto-applied when this customer is selected in POS or Sales invoices.
                  </p>
                </div>
                <button onClick={() => setShowSpecialPriceModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Add Special Price Form */}
              <form onSubmit={handleAddSpecialPrice} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="font-semibold text-slate-800">Add Special Price Rule:</div>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-6">
                    <select
                      required
                      value={newSpecialPrice.medicineId}
                      onChange={(e) => setNewSpecialPrice({ ...newSpecialPrice, medicineId: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="">Select Medicine...</option>
                      {medicines.map((m: any) => (
                        <option key={m.id} value={m.id}>
                          {m.name} (MRP: ₹{m.mrp})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Custom Price ₹"
                      value={newSpecialPrice.customPrice}
                      onChange={(e) => setNewSpecialPrice({ ...newSpecialPrice, customPrice: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div className="col-span-3">
                    <button
                      type="submit"
                      disabled={specialPriceMutation.isPending}
                      className="w-full py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold"
                    >
                      {specialPriceMutation.isPending ? 'Adding...' : 'Add Rule'}
                    </button>
                  </div>
                </div>
              </form>

              {/* Active Rules List */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                <div className="font-semibold text-slate-800">Configured Special Prices:</div>
                {partyPrices.length === 0 ? (
                  <p className="text-slate-400 py-3 text-center">No special pricing rules configured yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {partyPrices.map((rule: any) => (
                      <div key={rule.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <p className="font-bold text-slate-900">{rule.medicine?.name || 'Medicine'}</p>
                          <p className="text-[10px] text-slate-500">
                            Base MRP: ₹{rule.medicine?.mrp} | Custom Price: <b className="text-sky-700">₹{rule.customPrice}</b>
                            {rule.discountPercent > 0 && ` (${rule.discountPercent}% off)`}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteSpecialPriceMutation.mutate(rule.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
