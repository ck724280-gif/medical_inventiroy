'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Pill,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  Check,
  Barcode,
} from 'lucide-react';

import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { apiClient } from '../../lib/api-client';
import { DosageForm } from '@medical-inventory/shared-types';
import { formatCurrency } from '@medical-inventory/shared-utils';

export default function MedicinesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<any | null>(null);

  // Form State for Create/Edit
  const [formData, setFormData] = useState({
    name: '',
    genericName: '',
    brandName: '',
    composition: '',
    strength: '',
    dosageForm: DosageForm.TABLET,
    categoryId: '',
    manufacturerId: '',
    sku: '',
    barcode: '',
    hsnCode: '',
    taxPercent: 12,
    baseUnitId: '',
    mrp: 0,
    defaultPurchasePrice: 0,
    defaultSellingPrice: 0,
    reorderLevel: 10,
    reorderQty: 50,
    prescriptionRequired: false,
  });

  const { data: medicinesData, isLoading } = useQuery({
    queryKey: ['medicines', search, selectedCategory],
    queryFn: async () => {
      const res = await apiClient.get('/medicines', {
        params: {
          search: search || undefined,
          categoryId: selectedCategory || undefined,
          limit: 50,
        },
      });
      return res.data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiClient.get('/categories');
      return res.data || [];
    },
  });

  const { data: manufacturers } = useQuery({
    queryKey: ['manufacturers'],
    queryFn: async () => {
      const res = await apiClient.get('/manufacturers');
      return res.data || [];
    },
  });

  const { data: units } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const res = await apiClient.get('/units');
      return res.data || [];
    },
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingMedicine) {
        return apiClient.patch(`/medicines/${editingMedicine.id}`, data);
      }
      return apiClient.post('/medicines', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      setShowCreateModal(false);
      setEditingMedicine(null);
    },
  });

  const handleOpenCreate = () => {
    setEditingMedicine(null);
    setFormData({
      name: '',
      genericName: '',
      brandName: '',
      composition: '',
      strength: '',
      dosageForm: DosageForm.TABLET,
      categoryId: categories?.[0]?.id || '',
      manufacturerId: manufacturers?.[0]?.id || '',
      sku: `MED-${Date.now().toString(36).toUpperCase()}`,
      barcode: '',
      hsnCode: '30049099',
      taxPercent: 12,
      baseUnitId: units?.[0]?.id || '',
      mrp: 0,
      defaultPurchasePrice: 0,
      defaultSellingPrice: 0,
      reorderLevel: 10,
      reorderQty: 50,
      prescriptionRequired: false,
    });
    setShowCreateModal(true);
  };

  const handleOpenEdit = (med: any) => {
    setEditingMedicine(med);
    setFormData({
      name: med.name,
      genericName: med.genericName || '',
      brandName: med.brandName || '',
      composition: med.composition || '',
      strength: med.strength || '',
      dosageForm: med.dosageForm,
      categoryId: med.categoryId || '',
      manufacturerId: med.manufacturerId || '',
      sku: med.sku,
      barcode: med.barcode || '',
      hsnCode: med.hsnCode || '',
      taxPercent: med.taxPercent,
      baseUnitId: med.baseUnitId,
      mrp: med.mrp,
      defaultPurchasePrice: med.defaultPurchasePrice,
      defaultSellingPrice: med.defaultSellingPrice,
      reorderLevel: med.reorderLevel,
      reorderQty: med.reorderQty,
      prescriptionRequired: med.prescriptionRequired,
    });
    setShowCreateModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      mrp: Number(formData.mrp),
      defaultPurchasePrice: Number(formData.defaultPurchasePrice),
      defaultSellingPrice: Number(formData.defaultSellingPrice),
      taxPercent: Number(formData.taxPercent),
      reorderLevel: Number(formData.reorderLevel),
      reorderQty: Number(formData.reorderQty),
    });
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Header Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Medicine Master</h2>
              <p className="text-xs text-slate-500">
                Manage pharmaceutical catalog, generic compositions, dosage forms, and stock parameters.
              </p>
            </div>

            <button
              onClick={handleOpenCreate}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-sky-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add New Medicine
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[240px] relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Name, Generic, Brand, SKU or Barcode..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500 focus:bg-white transition"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories?.map((cat: any) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Medicines Catalog Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Medicine / Brand</th>
                    <th className="py-3 px-4">Generic Composition</th>
                    <th className="py-3 px-4">Dosage / Form</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Default Rate (₹)</th>
                    <th className="py-3 px-4 text-center">Available Stock</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Loading medicines catalog...
                      </td>
                    </tr>
                  ) : medicinesData?.data?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No medicines found matching your search.
                      </td>
                    </tr>
                  ) : (
                    medicinesData?.data?.map((med: any) => (
                      <tr key={med.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{med.name}</span>
                            {med.prescriptionRequired && (
                              <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[9px] font-bold">
                                Rx
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono">
                            SKU: {med.sku} {med.barcode && `| Barcode: ${med.barcode}`}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {med.genericName || med.composition || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-mono text-[10px]">
                            {med.dosageForm} {med.strength && `(${med.strength})`}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {med.category?.name || 'Uncategorized'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium">
                          ₹{med.defaultSellingPrice?.toFixed(2)}
                          <span className="text-[10px] text-slate-400 block">
                            MRP: ₹{med.mrp?.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full font-semibold font-mono text-[10px] ${
                              med.isOutOfStock
                                ? 'bg-red-100 text-red-700'
                                : med.isLowStock
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {med.totalStock} {med.baseUnit?.abbreviation}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleOpenEdit(med)}
                            className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {/* Create / Edit Medicine Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-sm text-slate-800">
                  {editingMedicine ? 'Edit Medicine' : 'Add New Medicine Master'}
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Medicine Name *</label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Paracetamol 650mg Tablets"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Generic Name</label>
                    <input
                      type="text"
                      value={formData.genericName}
                      onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                      placeholder="e.g. Paracetamol"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Brand Name</label>
                    <input
                      type="text"
                      value={formData.brandName}
                      onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                      placeholder="e.g. Dolo 650"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Dosage Form *</label>
                    <select
                      value={formData.dosageForm}
                      onChange={(e) => setFormData({ ...formData, dosageForm: e.target.value as DosageForm })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
                    >
                      {Object.values(DosageForm).map((df) => (
                        <option key={df} value={df}>
                          {df}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Category</label>
                    <select
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
                    >
                      <option value="">Select Category</option>
                      {categories?.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">SKU *</label>
                    <input
                      required
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Barcode</label>
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      placeholder="e.g. 8901234567890"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Base Unit *</label>
                    <select
                      required
                      value={formData.baseUnitId}
                      onChange={(e) => setFormData({ ...formData, baseUnitId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
                    >
                      <option value="">Select Unit</option>
                      {units?.map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.abbreviation})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">GST Tax % *</label>
                    <input
                      type="number"
                      value={formData.taxPercent}
                      onChange={(e) => setFormData({ ...formData, taxPercent: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">MRP (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.mrp}
                      onChange={(e) => setFormData({ ...formData, mrp: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Default Selling Price (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.defaultSellingPrice}
                      onChange={(e) =>
                        setFormData({ ...formData, defaultSellingPrice: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="rxCheck"
                    checked={formData.prescriptionRequired}
                    onChange={(e) => setFormData({ ...formData, prescriptionRequired: e.target.checked })}
                    className="w-4 h-4 text-sky-600 rounded"
                  />
                  <label htmlFor="rxCheck" className="font-semibold text-slate-700 cursor-pointer">
                    Prescription Required (Schedule H / Rx)
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl shadow transition"
                  >
                    {createMutation.isPending ? 'Saving...' : 'Save Medicine'}
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
