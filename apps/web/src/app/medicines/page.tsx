'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Filter,
  Pill,
  Edit2,
  Trash2,
  Lock,
  ShieldCheck,
  X,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { DosageForm } from '@medical-inventory/shared-types';
import { formatCurrency } from '@medical-inventory/shared-utils';

export default function MedicinesPage() {
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useAuthStore();
  const canManage = isSuperAdmin();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    genericName: '',
    brandName: '',
    dosageForm: DosageForm.TABLET,
    categoryId: '',
    sku: '',
    barcode: '',
    baseUnitId: '',
    taxPercent: 12,
    mrp: 0,
    defaultSellingPrice: 0,
    stripsPerBox: 10,
    tabletsPerStrip: 10,
    drugSchedule: 'OTC',
    prescriptionRequired: false,
  });

  const { data: medicinesData, isLoading } = useQuery({
    queryKey: ['medicines', search, selectedCategory, page],
    queryFn: async () => {
      const res = await apiClient.get('/medicines', {
        params: {
          search: search || undefined,
          categoryId: selectedCategory || undefined,
          page,
          limit: 20,
        },
      });
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiClient.get('/categories');
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
  });

  const { data: unitsData } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const res = await apiClient.get('/units');
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
  });

  const medicines = Array.isArray(medicinesData) ? medicinesData : [];
  const categories = Array.isArray(categoriesData) ? categoriesData : [];
  const units = Array.isArray(unitsData) ? unitsData : [];

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const isControlled = payload.drugSchedule !== 'OTC';
      const body = {
        ...payload,
        isScheduleH: payload.drugSchedule === 'SCHEDULE_H',
        isScheduleH1: payload.drugSchedule === 'SCHEDULE_H1',
        isScheduleX: payload.drugSchedule === 'SCHEDULE_X',
        prescriptionRequired: isControlled || payload.prescriptionRequired,
      };
      if (editingMedicine) {
        return apiClient.patch(`/medicines/${editingMedicine.id}`, body);
      }
      return apiClient.post('/medicines', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      setShowCreateModal(false);
      setEditingMedicine(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to save medicine.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/medicines/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      alert('Medicine deleted successfully.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete medicine.');
    },
  });

  const handleDelete = (med: any) => {
    if (!canManage) {
      alert('Only Super Admin can delete medicines.');
      return;
    }
    if (confirm(`Are you sure you want to delete "${med.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(med.id);
    }
  };

  const handleOpenCreate = () => {
    if (!canManage) {
      alert('Only Super Admin can add new medicines.');
      return;
    }
    setEditingMedicine(null);
    setFormData({
      name: '',
      genericName: '',
      brandName: '',
      dosageForm: DosageForm.TABLET,
      categoryId: categories[0]?.id || '',
      sku: '',
      barcode: '',
      baseUnitId: units[0]?.id || '',
      taxPercent: 12,
      mrp: 0,
      defaultSellingPrice: 0,
      stripsPerBox: 10,
      tabletsPerStrip: 10,
      drugSchedule: 'OTC',
      prescriptionRequired: false,
    });
    setShowCreateModal(true);
  };

  const handleOpenEdit = (med: any) => {
    if (!canManage) {
      alert('Only Super Admin can edit medicines.');
      return;
    }
    setEditingMedicine(med);
    setFormData({
      name: med.name,
      genericName: med.genericName || '',
      brandName: med.brandName || '',
      dosageForm: med.dosageForm || DosageForm.TABLET,
      categoryId: med.categoryId || '',
      sku: med.sku,
      barcode: med.barcode || '',
      baseUnitId: med.baseUnitId || '',
      taxPercent: med.taxPercent || 12,
      mrp: med.mrp || 0,
      defaultSellingPrice: med.defaultSellingPrice || 0,
      stripsPerBox: med.stripsPerBox || 10,
      tabletsPerStrip: med.tabletsPerStrip || 10,
      drugSchedule: med.drugSchedule || (med.isScheduleH ? 'SCHEDULE_H' : med.isScheduleH1 ? 'SCHEDULE_H1' : 'OTC'),
      prescriptionRequired: med.prescriptionRequired || false,
    });
    setShowCreateModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
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
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Medicine Master</h2>
                {canManage ? (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-mono text-[10px] font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Super Admin Access
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-mono text-[10px] font-medium flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Read Only (Staff)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage pharmacy product master, unit conversions, and drug schedules.
              </p>
            </div>

            {canManage && (
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Medicine
              </button>
            )}
          </div>

          {/* Filters Bar */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] shadow-sm dark:shadow-xl flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[220px] relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Medicine name, Generic, SKU or Barcode..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="">All Categories</option>
                {categories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Medicines Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] overflow-hidden shadow-sm dark:shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                <thead className="bg-slate-100/80 dark:bg-[#0c1322] text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Medicine / Brand</th>
                    <th className="py-3 px-4">Generic Molecule</th>
                    <th className="py-3 px-4">Dosage / Unit</th>
                    <th className="py-3 px-4">Packaging (Box➔Strip➔Tab)</th>
                    <th className="py-3 px-4">Schedule / Rx</th>
                    <th className="py-3 px-4 text-right">MRP</th>
                    <th className="py-3 px-4 text-right">Selling Price</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        Loading medicines catalogue...
                      </td>
                    </tr>
                  ) : medicines.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        No medicines found.
                      </td>
                    </tr>
                  ) : (
                    medicines.map((med: any) => {
                      const schedule = med.drugSchedule || (med.isScheduleH ? 'SCHEDULE_H' : med.isScheduleH1 ? 'SCHEDULE_H1' : 'OTC');
                      const isControlled = schedule !== 'OTC';

                      return (
                        <tr key={med.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">{med.name}</div>
                            {med.brandName && (
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Brand: {med.brandName}</div>
                            )}
                            <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500">SKU: {med.sku}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                            {med.genericName || med.composition || '—'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-medium text-[10px]">
                              {med.dosageForm}
                            </span>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {med.baseUnit?.abbreviation || 'PCS'}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-sky-600 dark:text-sky-400">
                            1 Box = {med.stripsPerBox || 10} Strips
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              1 Strip = {med.tabletsPerStrip || 10} Tabs
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isControlled
                                  ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800'
                                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              }`}
                            >
                              {schedule}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                            {formatCurrency(med.mrp || 0)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatCurrency(med.defaultSellingPrice || 0)}
                          </td>

                          {/* Action Buttons: Super Admin Only */}
                          <td className="py-3 px-4 text-center">
                            {canManage ? (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleOpenEdit(med)}
                                  title="Edit Medicine"
                                  className="p-1.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(med)}
                                  title="Delete Medicine"
                                  className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Locked</span>
                            )}
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

        {/* Create / Edit Medicine Modal */}
        {showCreateModal && canManage && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0f172a] rounded-2xl border border-slate-700 max-w-2xl w-full p-6 space-y-4 text-xs overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-sky-400">
                  <Pill className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-white">
                    {editingMedicine ? 'Edit Medicine Master' : 'Add New Medicine'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-300 mb-1">Medicine Name *</label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Augmentin 625 Duo"
                      className="w-full px-3 py-2 bg-[#090d16] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-sky-400"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Generic Composition</label>
                    <input
                      type="text"
                      value={formData.genericName}
                      onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                      placeholder="e.g. Amoxicillin & Potassium Clavulanate"
                      className="w-full px-3 py-2 bg-[#090d16] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-sky-400"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Brand Name</label>
                    <input
                      type="text"
                      value={formData.brandName}
                      onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                      placeholder="e.g. GSK"
                      className="w-full px-3 py-2 bg-[#090d16] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-sky-400"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Dosage Form *</label>
                    <select
                      value={formData.dosageForm}
                      onChange={(e) => setFormData({ ...formData, dosageForm: e.target.value as DosageForm })}
                      className="w-full px-3 py-2 bg-[#090d16] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-sky-400"
                    >
                      {Object.values(DosageForm).map((df) => (
                        <option key={df} value={df}>
                          {df}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Category</label>
                    <select
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      className="w-full px-3 py-2 bg-[#090d16] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-sky-400"
                    >
                      <option value="">Select Category</option>
                      {categories.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">SKU Code *</label>
                    <input
                      required
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="MED-AUG-625"
                      className="w-full px-3 py-2 bg-[#090d16] border border-slate-800 rounded-xl font-mono text-white focus:outline-none focus:border-sky-400"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Barcode / EAN-13</label>
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      placeholder="8901234567890"
                      className="w-full px-3 py-2 bg-[#090d16] border border-slate-800 rounded-xl font-mono text-white focus:outline-none focus:border-sky-400"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Base Packaging Unit *</label>
                    <select
                      required
                      value={formData.baseUnitId}
                      onChange={(e) => setFormData({ ...formData, baseUnitId: e.target.value })}
                      className="w-full px-3 py-2 bg-[#090d16] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-sky-400"
                    >
                      <option value="">Select Unit</option>
                      {units.map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.abbreviation})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">GST Tax Rate (%)</label>
                    <input
                      type="number"
                      value={formData.taxPercent}
                      onChange={(e) => setFormData({ ...formData, taxPercent: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-[#090d16] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-sky-400"
                    />
                  </div>

                  {/* Multi-Level Packaging Unit Conversion */}
                  <div className="col-span-2 p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                    <div className="font-bold text-sky-400 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-sky-400" />
                      <span>Packaging Ratio (Box ➔ Strip ➔ Tablets)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium text-slate-400 mb-1">Strips per Box</label>
                        <input
                          type="number"
                          min="1"
                          value={formData.stripsPerBox}
                          onChange={(e) => setFormData({ ...formData, stripsPerBox: parseInt(e.target.value) || 1 })}
                          className="w-full px-3 py-2 bg-[#090d16] border border-slate-800 rounded-xl font-mono text-white focus:outline-none focus:border-sky-400"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-400 mb-1">Tablets per Strip</label>
                        <input
                          type="number"
                          min="1"
                          value={formData.tabletsPerStrip}
                          onChange={(e) => setFormData({ ...formData, tabletsPerStrip: parseInt(e.target.value) || 1 })}
                          className="w-full px-3 py-2 bg-[#090d16] border border-slate-800 rounded-xl font-mono text-white focus:outline-none focus:border-sky-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pricing Fields */}
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">MRP (Maximum Retail Price) *</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={formData.mrp}
                      onChange={(e) => setFormData({ ...formData, mrp: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-[#090d16] border border-slate-800 rounded-xl font-mono text-white focus:outline-none focus:border-sky-400"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Default Selling Price *</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={formData.defaultSellingPrice}
                      onChange={(e) => setFormData({ ...formData, defaultSellingPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-[#090d16] border border-slate-800 rounded-xl font-mono text-white focus:outline-none focus:border-sky-400"
                    />
                  </div>

                  {/* Schedule Selection */}
                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-300 mb-1">Drug Regulatory Schedule</label>
                    <select
                      value={formData.drugSchedule}
                      onChange={(e) => setFormData({ ...formData, drugSchedule: e.target.value })}
                      className="w-full px-3 py-2 bg-[#090d16] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-sky-400"
                    >
                      <option value="OTC">OTC (Over The Counter - No Rx required)</option>
                      <option value="SCHEDULE_H">Schedule H (Requires Registered Medical Doctor Rx)</option>
                      <option value="SCHEDULE_H1">Schedule H1 (High-Risk Antibiotic / 3-Year Register)</option>
                      <option value="SCHEDULE_X">Schedule X (Narcotics &amp; Psychotropic Substances)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 font-bold text-white shadow-lg transition"
                  >
                    {createMutation.isPending ? 'Saving...' : editingMedicine ? 'Update Medicine' : 'Save Medicine'}
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
