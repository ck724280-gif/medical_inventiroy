'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Filter,
  Pill,
  MoreVertical,
  Edit2,
  FileSpreadsheet,
  AlertTriangle,
  X,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { apiClient } from '../../lib/api-client';
import { DosageForm } from '@medical-inventory/shared-types';
import { formatCurrency } from '@medical-inventory/shared-utils';

export default function MedicinesPage() {
  const queryClient = useQueryClient();
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
  });

  const handleOpenCreate = () => {
    setEditingMedicine(null);
    setFormData({
      name: '',
      genericName: '',
      brandName: '',
      dosageForm: DosageForm.TABLET,
      categoryId: '',
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
    <div className="flex h-screen bg-obsidian-950 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Medicine Master</h2>
              <p className="text-xs text-slate-500">
                Manage medicine catalogue, multi-level unit conversions, and legal drug schedules.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-sky-600/20 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Medicine
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[240px] relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Medicine name, Generic composition, SKU or Barcode..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500 focus:bg-white transition"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-sky-500"
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
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Medicine / Brand</th>
                    <th className="py-3 px-4">Generic Composition</th>
                    <th className="py-3 px-4">Dosage / Unit</th>
                    <th className="py-3 px-4">Conversion (Box ➔ Strip ➔ Tab)</th>
                    <th className="py-3 px-4">Schedule / Rx</th>
                    <th className="py-3 px-4 text-right">MRP</th>
                    <th className="py-3 px-4 text-right">Selling Price</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Loading medicines catalogue...
                      </td>
                    </tr>
                  ) : medicines.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No medicines found.
                      </td>
                    </tr>
                  ) : (
                    medicines.map((med: any) => {
                      const schedule = med.drugSchedule || (med.isScheduleH ? 'SCHEDULE_H' : med.isScheduleH1 ? 'SCHEDULE_H1' : 'OTC');
                      const isControlled = schedule !== 'OTC';

                      return (
                        <tr key={med.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{med.name}</div>
                            {med.brandName && (
                              <div className="text-[10px] text-slate-500 font-medium">Brand: {med.brandName}</div>
                            )}
                            <div className="font-mono text-[10px] text-slate-400">SKU: {med.sku}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                            {med.genericName || med.composition || '—'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[10px]">
                              {med.dosageForm}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {med.baseUnit?.abbreviation || 'PCS'}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-sky-800">
                            1 Box = {med.stripsPerBox || 10} Strips
                            <br />
                            1 Strip = {med.tabletsPerStrip || 10} Tabs
                          </td>
                          <td className="py-3 px-4">
                            {isControlled ? (
                              <span className="px-2 py-0.5 bg-red-100 text-red-800 border border-red-200 rounded-md font-bold text-[10px] inline-flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3 text-red-600" />
                                {schedule} (Rx)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md font-medium text-[10px]">
                                OTC
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-medium text-slate-600">
                            {formatCurrency(med.mrp || 0)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(med.defaultSellingPrice || 0)}
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
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {/* Create / Edit Medicine Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 text-xs overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Pill className="w-5 h-5 text-sky-600" />
                  <h3 className="font-bold text-sm text-slate-900">
                    {editingMedicine ? 'Edit Medicine Master' : 'Add New Medicine'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Medicine Name *</label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Augmentin 625 Duo"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Generic Composition</label>
                    <input
                      type="text"
                      value={formData.genericName}
                      onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                      placeholder="e.g. Amoxicillin & Potassium Clavulanate"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Brand Name</label>
                    <input
                      type="text"
                      value={formData.brandName}
                      onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                      placeholder="e.g. GSK"
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
                      {categories.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">SKU Code *</label>
                    <input
                      required
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="MED-AUG-625"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Barcode / EAN-13</label>
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      placeholder="8901234567890"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Base Packaging Unit *</label>
                    <select
                      required
                      value={formData.baseUnitId}
                      onChange={(e) => setFormData({ ...formData, baseUnitId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
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
                    <label className="block font-semibold text-slate-700 mb-1">GST Tax Rate (%)</label>
                    <input
                      type="number"
                      value={formData.taxPercent}
                      onChange={(e) => setFormData({ ...formData, taxPercent: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  {/* Multi-Level Packaging Unit Conversion */}
                  <div className="col-span-2 p-3 bg-sky-50 rounded-xl border border-sky-200 space-y-2">
                    <div className="font-bold text-sky-900 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-sky-600" />
                      Multi-Level Unit Conversion Hierarchy (Box ➔ Strip ➔ Tablet)
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Strips per Box</label>
                        <input
                          type="number"
                          min="1"
                          value={formData.stripsPerBox}
                          onChange={(e) => setFormData({ ...formData, stripsPerBox: parseInt(e.target.value) || 10 })}
                          className="w-full px-3 py-2 bg-white border border-sky-300 rounded-xl focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Tablets/Units per Strip</label>
                        <input
                          type="number"
                          min="1"
                          value={formData.tabletsPerStrip}
                          onChange={(e) => setFormData({ ...formData, tabletsPerStrip: parseInt(e.target.value) || 10 })}
                          className="w-full px-3 py-2 bg-white border border-sky-300 rounded-xl focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Legal Compliance Drug Schedule */}
                  <div className="col-span-2 p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                    <div className="font-bold text-amber-900 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                      Drug Schedule Classification (Legal Compliance)
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Schedule Classification</label>
                        <select
                          value={formData.drugSchedule}
                          onChange={(e) => setFormData({ ...formData, drugSchedule: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl focus:outline-none"
                        >
                          <option value="OTC">OTC (Over the Counter - General)</option>
                          <option value="SCHEDULE_H">Schedule H (Prescription Mandatory)</option>
                          <option value="SCHEDULE_H1">Schedule H1 (Controlled Antibiotic)</option>
                          <option value="SCHEDULE_X">Schedule X (Strict Narcotic Register)</option>
                        </select>
                      </div>
                      <div className="flex items-center pt-5">
                        <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.prescriptionRequired || formData.drugSchedule !== 'OTC'}
                            onChange={(e) => setFormData({ ...formData, prescriptionRequired: e.target.checked })}
                            className="w-4 h-4 text-sky-600 rounded"
                          />
                          Doctor Rx Required at Billing
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">MRP (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.mrp}
                      onChange={(e) => setFormData({ ...formData, mrp: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Selling Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.defaultSellingPrice}
                      onChange={(e) => setFormData({ ...formData, defaultSellingPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none font-mono"
                    />
                  </div>
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
