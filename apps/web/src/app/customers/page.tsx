'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Users,
  Edit2,
  Trash2,
  Lock,
  ShieldCheck,
  X,
  MessageCircle,
  Tag,
  TrendingDown,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
} from 'lucide-react';
import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { PageHeader } from '../../components/ui/page-header';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { formatCurrency, generatePaymentReminderUrl } from '@medical-inventory/shared-utils';

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const { isSuperAdmin, hasPermission } = useAuthStore();
  const canManage = isSuperAdmin() || hasPermission('customer.create') || hasPermission('customer.edit');
  const canDelete = isSuperAdmin() || hasPermission('customer.delete') || hasPermission('customer.edit');

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
    creditLimit: 0,
    notes: '',
  });

  const { data: customersData, isLoading, refetch } = useQuery({
    queryKey: ['customers-list', search],
    queryFn: async () => {
      const res = await apiClient.get('/customers', {
        params: { search: search || undefined },
      });
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
  });

  const customers = Array.isArray(customersData) ? customersData : [];

  const totalCustomersCount = customers.length;
  const totalReceivableBalance = customers.reduce(
    (sum: number, c: any) => sum + Math.max(0, Number(c.currentBalance || c.balance || 0)),
    0
  );

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
      refetch();
      alert(editingCustomer ? 'Customer updated successfully!' : 'Customer registered successfully!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to save customer.');
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers-list'] });
      refetch();
      alert('Customer deleted successfully.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete customer.');
    },
  });

  const saveSpecialPriceMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/party-pricing', payload);
    },
    onSuccess: () => {
      refetchPartyPrices();
      setNewSpecialPrice({ medicineId: '', customPrice: '', discountPercent: '' });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to add pricing rule.');
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
    setFormData({
      name: '',
      mobile: '',
      email: '',
      address: '',
      gstNumber: '',
      creditLimit: 10000,
      notes: '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (c: any) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name || '',
      mobile: c.mobile || '',
      email: c.email || '',
      address: c.address || '',
      gstNumber: c.gstNumber || '',
      creditLimit: Number(c.creditLimit || 0),
      notes: c.notes || '',
    });
    setShowModal(true);
  };

  const handleDeleteCustomer = (c: any) => {
    if (
      confirm(
        `Are you sure you want to delete customer "${c.name}"?\n\nThis will remove the customer from the directory.`
      )
    ) {
      deleteCustomerMutation.mutate(c.id);
    }
  };

  const handleOpenSpecialPricing = (c: any) => {
    setSpecialPricingCustomer(c);
    setShowSpecialPriceModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Customer Name is required');
      return;
    }
    customerMutation.mutate(formData);
  };

  const handleWhatsAppReminder = (c: any) => {
    const url = generatePaymentReminderUrl(c.mobile, c.name, c.currentBalance || c.balance || 0);
    window.open(url, '_blank');
  };

  const handleAddSpecialPrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!specialPricingCustomer || !newSpecialPrice.medicineId) return;

    saveSpecialPriceMutation.mutate({
      customerId: specialPricingCustomer.id,
      medicineId: newSpecialPrice.medicineId,
      customPrice: newSpecialPrice.customPrice ? parseFloat(newSpecialPrice.customPrice) : undefined,
      discountPercent: newSpecialPrice.discountPercent ? parseFloat(newSpecialPrice.discountPercent) : undefined,
    });
  };

  return (
    <div className="flex h-screen bg-surface-page text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-200">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <main className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-5">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-text-primary tracking-tight flex items-center gap-2">
                  <Users className="w-5 h-5 text-accent-primary" />
                  Customer &amp; Patient Directory
                </h2>
                {canManage ? (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Full Access
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-surface-raised border border-slate-200 dark:border-slate-700 text-text-muted font-mono text-[10px] font-medium flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Read Only
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Manage registered patients, customer credit limits, outstanding ledgers, and custom party pricing.
              </p>
            </div>

            {canManage && (
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 bg-accent-primary hover:bg-accent-hover text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg transition cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Add Customer
              </button>
            )}
          </div>

          {/* KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-surface-base border border-border-default shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-text-muted">Total Registered Patients</p>
                <p className="text-xl font-black text-text-primary font-mono mt-0.5">
                  {totalCustomersCount}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-accent-primary flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-base border border-border-default shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-text-muted">Total Outstanding Receivable</p>
                <p className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                  {formatCurrency(totalReceivableBalance)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-3.5 rounded-2xl border border-border-default bg-surface-base shadow-sm flex items-center gap-3">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Patient Name, Mobile, Email, GST, or Address..."
                className="w-full pl-9 pr-3 py-2 bg-surface-page border border-border-default rounded-xl text-xs text-text-primary placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
              />
            </div>
          </div>

          {/* Customers Table */}
          <div className="rounded-2xl border border-border-default bg-surface-base overflow-hidden shadow-sm dark:shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                <thead className="bg-surface-raised text-text-muted font-semibold border-b border-border-default text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Customer / Patient</th>
                    <th className="py-3 px-4">Mobile Number</th>
                    <th className="py-3 px-4">GST / Address</th>
                    <th className="py-3 px-4 text-right">Outstanding Balance</th>
                    <th className="py-3 px-4 text-right">Credit Limit</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        Loading customer records...
                      </td>
                    </tr>
                  ) : customers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        No customer records found. Click "Add Customer" to register a patient.
                      </td>
                    </tr>
                  ) : (
                    customers.map((c: any) => {
                      const balance = c.currentBalance || c.balance || 0;
                      return (
                        <tr key={c.id} className="hover:bg-surface-raised transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-text-primary">{c.name}</div>
                            {c.email && (
                              <div className="text-[10px] text-slate-400 font-mono">{c.email}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-accent-primary font-semibold">
                            {c.mobile || '—'}
                          </td>
                          <td className="py-3 px-4 text-text-muted">
                            {c.gstNumber && (
                              <span className="font-mono text-[10px] text-accent-primary block">
                                GST: {c.gstNumber}
                              </span>
                            )}
                            <span className="truncate max-w-xs block">{c.address || '—'}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold">
                            <span
                              className={
                                balance > 0
                                  ? 'text-amber-600 dark:text-amber-400 font-semibold'
                                  : balance < 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-slate-400'
                              }
                            >
                              {formatCurrency(balance)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-text-muted">
                            {c.creditLimit ? formatCurrency(c.creditLimit) : 'No Limit'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {balance > 0 && c.mobile && (
                                <button
                                  onClick={() => handleWhatsAppReminder(c)}
                                  title="Send WhatsApp Payment Reminder"
                                  className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-surface-raised rounded-lg transition"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenSpecialPricing(c)}
                                title="Special Pricing Matrix"
                                className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-surface-raised rounded-lg transition"
                              >
                                <Tag className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit & Delete Controls */}
                              {canManage && (
                                <button
                                  onClick={() => handleOpenEdit(c)}
                                  title="Edit Customer"
                                  className="p-1.5 text-text-muted hover:text-sky-600 dark:hover:text-sky-400 hover:bg-surface-raised rounded-lg transition"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => handleDeleteCustomer(c)}
                                  title="Delete Customer"
                                  className="p-1.5 text-text-muted hover:text-red-600 dark:hover:text-red-400 hover:bg-surface-raised rounded-lg transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
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

        {/* Modal: Create / Edit Customer */}
        {showModal && canManage && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface-base rounded-2xl border border-border-default max-w-md w-full p-6 space-y-4 text-xs shadow-2xl text-slate-900 dark:text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-border-default">
                <div className="flex items-center gap-2 text-accent-primary">
                  <Users className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-text-primary">
                    {editingCustomer ? `Edit Customer: ${editingCustomer.name}` : 'Add New Customer'}
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
                <div>
                  <label className="block font-semibold text-text-secondary mb-1">
                    Customer / Patient Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-text-secondary mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="9876543210 (Optional for walk-in)"
                    className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl font-mono text-text-primary focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-text-secondary mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="patient@example.com"
                    className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-text-secondary mb-1">
                      Credit Limit (₹)
                    </label>
                    <input
                      type="number"
                      onFocus={(e) => e.target.select()}
                      value={formData.creditLimit || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="10000"
                      className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl font-mono text-text-primary focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-text-secondary mb-1">
                      GSTIN (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.gstNumber}
                      onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                      placeholder="29AAAAA0000A1Z5"
                      className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl font-mono text-text-primary focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-text-secondary mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="House / Street / City"
                    className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-text-secondary mb-1">
                    Notes / Remarks
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="e.g. Regular diabetic patient"
                    className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-border-default">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl bg-surface-raised text-text-secondary hover:bg-surface-active font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={customerMutation.isPending}
                    className="px-5 py-2 rounded-xl bg-accent-primary hover:bg-accent-hover font-bold text-white shadow-lg transition active:scale-95"
                  >
                    {customerMutation.isPending
                      ? 'Saving...'
                      : editingCustomer
                      ? 'Update Customer'
                      : 'Save Customer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Special Pricing Matrix */}
        {showSpecialPriceModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface-base rounded-2xl border border-border-default max-w-xl w-full p-6 space-y-4 text-xs max-h-[90vh] overflow-y-auto shadow-2xl text-slate-900 dark:text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-border-default">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <Tag className="w-5 h-5" />
                  <div>
                    <h3 className="font-bold text-sm text-text-primary">
                      Party-Wise Special Pricing Matrix
                    </h3>
                    <p className="text-[10px] text-text-muted font-semibold">
                      {specialPricingCustomer?.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSpecialPriceModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {canManage && (
                <form
                  onSubmit={handleAddSpecialPrice}
                  className="p-3.5 bg-surface-page rounded-xl border border-border-default space-y-3"
                >
                  <p className="font-bold text-text-primary">Add Special Price Rule</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-3 sm:col-span-1">
                      <label className="block text-[10px] text-text-muted mb-1">
                        Select Medicine *
                      </label>
                      <select
                        required
                        value={newSpecialPrice.medicineId}
                        onChange={(e) =>
                          setNewSpecialPrice({ ...newSpecialPrice, medicineId: e.target.value })
                        }
                        className="w-full px-2 py-1.5 bg-surface-base border border-border-strong rounded-lg text-text-primary text-xs focus:outline-none focus:border-sky-500"
                      >
                        <option value="">Select Item</option>
                        {medicines.map((m: any) => (
                          <option key={m.id} value={m.id}>
                            {m.name} (MRP: ₹{m.mrp})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-text-muted mb-1">
                        Fixed Custom Price (₹)
                      </label>
                      <input
                        type="number"
                        onFocus={(e) => e.target.select()}
                        step="0.01"
                        placeholder="e.g. 180"
                        value={newSpecialPrice.customPrice}
                        onChange={(e) =>
                          setNewSpecialPrice({ ...newSpecialPrice, customPrice: e.target.value })
                        }
                        className="w-full px-2 py-1.5 bg-surface-base border border-border-strong rounded-lg text-text-primary text-xs focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-text-muted mb-1">
                        Discount (%)
                      </label>
                      <input
                        type="number"
                        onFocus={(e) => e.target.select()}
                        placeholder="e.g. 10"
                        value={newSpecialPrice.discountPercent}
                        onChange={(e) =>
                          setNewSpecialPrice({ ...newSpecialPrice, discountPercent: e.target.value })
                        }
                        className="w-full px-2 py-1.5 bg-surface-base border border-border-strong rounded-lg text-text-primary text-xs focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={saveSpecialPriceMutation.isPending}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 font-bold text-white rounded-lg transition text-xs active:scale-95"
                    >
                      {saveSpecialPriceMutation.isPending ? 'Adding...' : 'Add Rule'}
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                <p className="font-bold text-text-secondary">Active Configured Price Rules</p>
                {partyPrices.length === 0 ? (
                  <p className="text-slate-500 py-4 text-center">No special pricing rules configured yet.</p>
                ) : (
                  <div className="divide-y divide-border-default border border-border-default rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950">
                    {partyPrices.map((rule: any) => (
                      <div
                        key={rule.id}
                        className="p-3 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-900"
                      >
                        <div>
                          <p className="font-bold text-text-primary">
                            {rule.medicine?.name || 'Medicine'}
                          </p>
                          <p className="text-[10px] text-text-muted font-mono">
                            Base MRP: ₹{rule.medicine?.mrp} | Custom Price:{' '}
                            <b className="text-accent-primary">₹{rule.customPrice}</b>
                            {rule.discountPercent > 0 && ` (${rule.discountPercent}% off)`}
                          </p>
                        </div>
                        {canManage && (
                          <button
                            onClick={() => deleteSpecialPriceMutation.mutate(rule.id)}
                            className="p-1 text-slate-500 hover:text-red-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
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
