'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  MessageCircle,
  Send,
  Lock,
  ShieldCheck,
  X,
  Phone,
  Mail,
  FileText,
  CreditCard,
  MapPin,
  TrendingUp,
  Users,
} from 'lucide-react';

import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { PageHeader } from '../../components/ui/page-header';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { formatCurrency } from '@medical-inventory/shared-utils';
import { extractDataArray } from '../../lib/utils';

export default function SuppliersPage() {
  const { selectedBranchId } = useAuthStore();
  const [whatsAppModalSupplier, setWhatsAppModalSupplier] = useState<any | null>(null);
  const [whatsAppMsgText, setWhatsAppMsgText] = useState('');

  const sendSupplierMsgMutation = useMutation({
    mutationFn: async ({ phone, name, content }: { phone: string; name: string; content: string }) =>
      apiClient.post('/whatsapp/send-message', {
        branchId: selectedBranchId || undefined,
        recipientPhone: phone,
        recipientName: name,
        content,
      }),
    onSuccess: () => {
      alert('WhatsApp message dispatched to supplier successfully!');
      setWhatsAppModalSupplier(null);
      setWhatsAppMsgText('');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to send WhatsApp message. Please check WhatsApp pairing in Settings.');
    },
  });

  const queryClient = useQueryClient();
  const { isSuperAdmin, hasPermission } = useAuthStore();
  const canManage = isSuperAdmin() || hasPermission('supplier.create') || hasPermission('supplier.edit');
  const canDelete = isSuperAdmin() || hasPermission('supplier.delete') || hasPermission('supplier.edit');

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    company: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstNumber: '',
    drugLicense: '',
    paymentTerms: '',
    creditLimit: 0,
    openingBalance: 0,
    address: '',
    city: '',
    state: '',
    pinZip: '',
  });

  const { data: suppliersData, isLoading, refetch } = useQuery({
    queryKey: ['suppliers-list', search],
    queryFn: async () => {
      const res = await apiClient.get('/suppliers', {
        params: { search: search || undefined, limit: 100 },
      });
      return res.data;
    },
  });

  const suppliers = extractDataArray(suppliersData);

  const totalSuppliersCount = suppliers.length;
  const totalOutstandingBalance = suppliers.reduce((sum: number, s: any) => sum + Number(s.currentBalance || 0), 0);

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
      refetch();
      alert(editingSupplier ? 'Supplier updated successfully!' : 'Supplier added successfully!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to save supplier.');
    },
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/suppliers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers-list'] });
      refetch();
      alert('Supplier deleted successfully.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete supplier.');
    },
  });

  const handleOpenCreate = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      company: '',
      contactPerson: '',
      phone: '',
      email: '',
      gstNumber: '',
      drugLicense: '',
      paymentTerms: '30 Days Net',
      creditLimit: 100000,
      openingBalance: 0,
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
      name: sup.name || '',
      company: sup.company || '',
      contactPerson: sup.contactPerson || '',
      phone: sup.phone || '',
      email: sup.email || '',
      gstNumber: sup.gstNumber || '',
      drugLicense: '',
      paymentTerms: sup.paymentTerms || '',
      creditLimit: Number(sup.creditLimit || 0),
      openingBalance: Number(sup.openingBalance || 0),
      address: sup.address || '',
      city: '',
      state: '',
      pinZip: '',
    });
    setShowModal(true);
  };

  const handleDelete = (sup: any) => {
    if (confirm(`Are you sure you want to delete supplier "${sup.name}"?\n\nThis will remove the supplier from active lists.`)) {
      deleteSupplierMutation.mutate(sup.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Supplier Name is required');
      return;
    }
    if (!formData.phone.trim()) {
      alert('Supplier Phone is required');
      return;
    }
    supplierMutation.mutate(formData);
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
                  <Building2 className="w-5 h-5 text-accent-primary" />
                  Suppliers &amp; Distributors
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
                Manage medicine distributors, pharma agencies, credit ledgers, and DL/GST credentials.
              </p>
            </div>

            {canManage && (
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 bg-accent-primary hover:bg-accent-hover text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg transition cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Add Supplier
              </button>
            )}
          </div>

          {/* KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-surface-base border border-border-default shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-text-muted">Total Active Suppliers</p>
                <p className="text-xl font-black text-text-primary font-mono mt-0.5">
                  {totalSuppliersCount}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-accent-primary flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-base border border-border-default shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-text-muted">Total Outstanding Payable</p>
                <p className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                  {formatCurrency(totalOutstandingBalance)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
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
                placeholder="Search Supplier Name, Company, Contact Person, Phone, or GST..."
                className="w-full pl-9 pr-3 py-2 bg-surface-page border border-border-default rounded-xl text-xs text-text-primary placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
              />
            </div>
          </div>

          {/* Suppliers Table */}
          <div className="rounded-2xl border border-border-default bg-surface-base overflow-hidden shadow-sm dark:shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                <thead className="bg-surface-raised text-text-muted font-semibold border-b border-border-default text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Supplier / Firm Name</th>
                    <th className="py-3 px-4">Contact Person</th>
                    <th className="py-3 px-4">Phone / Email</th>
                    <th className="py-3 px-4">GST / License</th>
                    <th className="py-3 px-4 text-right">Outstanding Balance</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        Loading suppliers catalogue...
                      </td>
                    </tr>
                  ) : suppliers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        No suppliers found. Click &quot;Add Supplier&quot; to register a distributor.
                      </td>
                    </tr>
                  ) : (
                    suppliers.map((sup: any) => (
                      <tr key={sup.id} className="hover:bg-surface-raised transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-text-primary">{sup.name}</div>
                          {sup.company && (
                            <div className="text-[10px] text-text-muted">{sup.company}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-text-muted">
                          {sup.contactPerson || '—'}
                        </td>
                        <td className="py-3 px-4 font-mono text-text-muted">
                          <div>{sup.phone}</div>
                          {sup.email && <div className="text-[10px] text-slate-400">{sup.email}</div>}
                        </td>
                        <td className="py-3 px-4 font-mono text-[10px] text-text-muted">
                          <div>GST: {sup.gstNumber || 'N/A'}</div>
                          {sup.address && <div className="truncate max-w-xs">{sup.address}</div>}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          <span className={Number(sup.currentBalance || 0) > 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-400'}>
                            {formatCurrency(sup.currentBalance || 0)}
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 px-4 text-center">
                          {canManage ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEdit(sup)}
                                title="Edit Supplier"
                                className="p-1.5 text-text-muted hover:text-sky-600 dark:hover:text-sky-400 hover:bg-surface-raised rounded-lg transition"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {canDelete && (
                                <button
                                  onClick={() => handleDelete(sup)}
                                  title="Delete Supplier"
                                  className="p-1.5 text-text-muted hover:text-red-600 dark:hover:text-red-400 hover:bg-surface-raised rounded-lg transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 p-1.5" title="Read only access">
                              <Lock className="w-3.5 h-3.5 opacity-50" />
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        
        {/* Supplier WhatsApp Messaging Modal */}
        {whatsAppModalSupplier && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface-base border border-emerald-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 text-xs shadow-2xl text-text-primary animate-scale-in">
              <div className="flex items-center justify-between pb-3 border-b border-border-default">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-sm text-text-primary">
                    WhatsApp Distributor: {whatsAppModalSupplier.name}
                  </h3>
                </div>
                <button
                  onClick={() => setWhatsAppModalSupplier(null)}
                  className="text-text-muted hover:text-text-primary font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-raised border border-border-default space-y-1">
                <div className="flex justify-between">
                  <span className="text-text-muted">Supplier Mobile:</span>
                  <span className="font-mono font-bold text-text-primary">{whatsAppModalSupplier.phone || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Outstanding Payable:</span>
                  <span className="font-mono font-bold text-amber-500">₹{Number(whatsAppModalSupplier.currentBalance || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Quick Template Chips */}
              <div className="space-y-1.5">
                <label className="font-semibold text-text-secondary block">Quick Template:</label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setWhatsAppMsgText(`Namaste ${whatsAppModalSupplier.name} ji, please send the latest price list and medicine stock availability for our pharmacy.`)
                    }
                    className="px-2.5 py-1 bg-surface-page hover:bg-surface-raised border border-border-default rounded-lg text-[11px] text-text-secondary"
                  >
                    📦 Stock & Price Inquiry
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setWhatsAppMsgText(`Namaste ${whatsAppModalSupplier.name} ji, we have processed the payment. Please confirm receipt and share the ledger statement.`)
                    }
                    className="px-2.5 py-1 bg-surface-page hover:bg-surface-raised border border-border-default rounded-lg text-[11px] text-text-secondary"
                  >
                    💳 Payment Confirmation
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-text-secondary block">Message Content *</label>
                <textarea
                  rows={4}
                  value={whatsAppMsgText}
                  onChange={(e) => setWhatsAppMsgText(e.target.value)}
                  placeholder="Type your WhatsApp message to supplier..."
                  className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-xs text-text-primary focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-border-default flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setWhatsAppModalSupplier(null)}
                  className="px-3.5 py-2 text-text-muted hover:bg-surface-raised rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!whatsAppModalSupplier.phone) {
                      alert('Supplier phone number is missing.');
                      return;
                    }
                    if (!whatsAppMsgText.trim()) {
                      alert('Message text cannot be empty.');
                      return;
                    }
                    sendSupplierMsgMutation.mutate({
                      phone: whatsAppModalSupplier.phone,
                      name: whatsAppModalSupplier.name,
                      content: whatsAppMsgText.trim(),
                    });
                  }}
                  disabled={sendSupplierMsgMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sendSupplierMsgMutation.isPending ? 'Sending...' : 'Send WhatsApp Message'}
                </button>
              </div>
            </div>
          </div>
        )}

        </main>

        {/* Modal: Create / Edit Supplier */}
        {showModal && canManage && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface-base rounded-2xl border border-border-default max-w-xl w-full p-6 space-y-4 text-xs overflow-y-auto max-h-[90vh] shadow-2xl text-slate-900 dark:text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-border-default">
                <div className="flex items-center gap-2 text-accent-primary">
                  <Building2 className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-text-primary">
                    {editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : 'Add New Supplier'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block font-semibold text-text-secondary mb-1">
                      Supplier / Firm Name *
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Cipla Healthcare Ltd."
                      className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block font-semibold text-text-secondary mb-1">
                      Company Brand / Agency
                    </label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="e.g. Cipla Pharma Division"
                      className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-text-secondary mb-1">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-text-secondary mb-1">
                      Mobile / Phone *
                    </label>
                    <input
                      required
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="9876543210"
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
                      placeholder="orders@supplier.com"
                      className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-text-secondary mb-1">
                      GSTIN Number
                    </label>
                    <input
                      type="text"
                      value={formData.gstNumber}
                      onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                      placeholder="29AAAAA0000A1Z5"
                      className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl font-mono text-text-primary focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-text-secondary mb-1">
                      Drug License Number
                    </label>
                    <input
                      type="text"
                      value={formData.drugLicense}
                      onChange={(e) => setFormData({ ...formData, drugLicense: e.target.value })}
                      placeholder="DL-12345/KA"
                      className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl font-mono text-text-primary focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-text-secondary mb-1">
                      Payment Terms
                    </label>
                    <input
                      type="text"
                      value={formData.paymentTerms}
                      onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                      placeholder="e.g. 30 Days Net"
                      className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block font-semibold text-text-secondary mb-1">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Plot 42, Industrial Pharma Estate"
                      className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-text-secondary mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="e.g. Mumbai"
                      className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-text-secondary mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="e.g. Maharashtra"
                      className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                    />
                  </div>
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
                    disabled={supplierMutation.isPending}
                    className="px-5 py-2 rounded-xl bg-accent-primary hover:bg-accent-hover font-bold text-white shadow-lg transition active:scale-95"
                  >
                    {supplierMutation.isPending ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Save Supplier'}
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

