'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Filter,
  Pill,
  Edit2,
  Trash2,
  Lock,
  ShieldCheck,
  X,
  Layers,
  ShieldAlert,
  Boxes,
} from 'lucide-react';
import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import {
  PageHeader,
  DataTable,
  Column,
  Badge,
  Button,
  Card,
  Input,
  Select,
  Modal,
} from '../../components/ui';
import { SmartAutocomplete } from '../../components/ui/smart-autocomplete';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { DosageForm } from '@medical-inventory/shared-types';
import { formatCurrency } from '@medical-inventory/shared-utils';
import { extractDataArray, extractTotalCount } from '../../lib/utils';

export default function MedicinesPage() {
  const queryClient = useQueryClient();
  const { isSuperAdmin, hasPermission } = useAuthStore();
  const canManage = isSuperAdmin() || hasPermission('medicine.create') || hasPermission('medicine.edit');
  const canDelete = isSuperAdmin() || hasPermission('medicine.delete');

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
    defaultPurchasePrice: 0,
    defaultSellingPrice: 0,
    stripsPerBox: 10,
    tabletsPerStrip: 10,
    drugSchedule: 'OTC',
    prescriptionRequired: false,
  });

  const { data: medicinesResp, isLoading } = useQuery({
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
      return res.data;
    },
  });

  const { data: categoriesResp } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiClient.get('/categories');
      return res.data;
    },
  });

  const { data: unitsResp } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const res = await apiClient.get('/units');
      return res.data;
    },
  });

  const medicines = extractDataArray(medicinesResp);
  const totalMedicines = extractTotalCount(medicinesResp, medicines.length);
  const categories = extractDataArray(categoriesResp);
  const units = extractDataArray(unitsResp);

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const isControlled = payload.drugSchedule !== 'OTC';
      const body = {
        name: payload.name.trim(),
        genericName: payload.genericName?.trim() || undefined,
        brandName: payload.brandName?.trim() || undefined,
        dosageForm: payload.dosageForm,
        categoryId: payload.categoryId?.trim() || undefined,
        sku: payload.sku?.trim() || undefined,
        barcode: payload.barcode?.trim() || undefined,
        baseUnitId: payload.baseUnitId || units[0]?.id,
        taxPercent: Number(payload.taxPercent || 0),
        mrp: Number(payload.mrp || 0),
        defaultPurchasePrice: Number(payload.defaultPurchasePrice || 0),
        defaultSellingPrice: Number(payload.defaultSellingPrice || 0),
        stripsPerBox: Number(payload.stripsPerBox || 10),
        tabletsPerStrip: Number(payload.tabletsPerStrip || 10),
        drugSchedule: payload.drugSchedule || 'OTC',
        isScheduleH: payload.drugSchedule === 'SCHEDULE_H',
        isScheduleH1: payload.drugSchedule === 'SCHEDULE_H1',
        isScheduleX: payload.drugSchedule === 'SCHEDULE_X',
        prescriptionRequired: isControlled || Boolean(payload.prescriptionRequired),
      };

      if (editingMedicine) {
        return apiClient.patch(`/medicines/${editingMedicine.id}`, body);
      }
      return apiClient.post('/medicines', body);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      setShowCreateModal(false);
      setEditingMedicine(null);
      alert(editingMedicine ? 'Medicine updated successfully!' : 'Medicine created successfully!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || err.message || 'Failed to save medicine.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/medicines/${id}`);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      alert(res.data?.message || 'Medicine deleted/removed successfully.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || err.message || 'Failed to delete medicine.');
    },
  });

  const handleDelete = (med: any) => {
    if (!canDelete) {
      alert('You do not have permission to delete medicines.');
      return;
    }
    if (confirm(`Are you sure you want to delete ${med.name}? This will remove it from future billing.`)) {
      deleteMutation.mutate(med.id);
    }
  };

  const handleOpenCreate = () => {
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
      defaultPurchasePrice: 0,
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
      sku: med.sku || '',
      barcode: med.barcode || '',
      baseUnitId: med.baseUnitId || '',
      taxPercent: med.taxPercent || 12,
      mrp: med.mrp || 0,
      defaultPurchasePrice: med.defaultPurchasePrice || 0,
      defaultSellingPrice: med.defaultSellingPrice || 0,
      stripsPerBox: med.stripsPerBox || 10,
      tabletsPerStrip: med.tabletsPerStrip || 10,
      drugSchedule: med.drugSchedule || (med.isScheduleH ? 'SCHEDULE_H' : med.isScheduleH1 ? 'SCHEDULE_H1' : med.isScheduleX ? 'SCHEDULE_X' : 'OTC'),
      prescriptionRequired: Boolean(med.prescriptionRequired),
    });
    setShowCreateModal(true);
  };

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Medicine / Brand',
      render: (med) => (
        <div>
          <div className="font-bold text-text-primary">{med.name}</div>
          {med.brandName && (
            <div className="text-[11px] text-text-muted font-medium">Brand: {med.brandName}</div>
          )}
          <div className="font-mono text-[10px] text-text-disabled">SKU: {med.sku}</div>
        </div>
      ),
    },
    {
      key: 'genericName',
      header: 'Generic Molecule',
      render: (med) => (
        <span className="text-text-secondary text-xs truncate max-w-xs block">
          {med.genericName || med.composition || '—'}
        </span>
      ),
    },
    {
      key: 'dosage',
      header: 'Dosage / Unit',
      render: (med) => (
        <div>
          <Badge variant="default" size="sm">
            {med.dosageForm}
          </Badge>
          <div className="text-[10px] text-text-muted mt-0.5">
            {med.baseUnit?.abbreviation || 'PCS'}
          </div>
        </div>
      ),
    },
    {
      key: 'packaging',
      header: 'Packaging (Box➔Strip➔Tab)',
      render: (med) => (
        <div className="font-mono text-[11px] text-accent">
          1 Box = {med.stripsPerBox || 10} Strips
          <div className="text-[10px] text-text-muted">
            1 Strip = {med.tabletsPerStrip || 10} Tabs
          </div>
        </div>
      ),
    },
    {
      key: 'schedule',
      header: 'Schedule / Rx',
      render: (med) => {
        const schedule = med.drugSchedule || (med.isScheduleH ? 'SCHEDULE_H' : med.isScheduleH1 ? 'SCHEDULE_H1' : med.isScheduleX ? 'SCHEDULE_X' : 'OTC');
        const isControlled = schedule !== 'OTC';
        return (
          <Badge
            variant={isControlled ? 'error' : 'success'}
            size="sm"
          >
            {schedule}
          </Badge>
        );
      },
    },
    {
      key: 'stockStatus',
      header: 'Stock Status',
      render: (med) => {
        const totalStock = Number(med.totalStock ?? 0);
        if (totalStock > 10) {
          return (
            <Badge variant="success" size="sm" dot>
              In Stock ({totalStock})
            </Badge>
          );
        }
        if (totalStock > 0) {
          return (
            <Badge variant="warning" size="sm" dot>
              Low ({totalStock})
            </Badge>
          );
        }
        return (
          <Badge variant="error" size="sm" dot>
            Out of Stock
          </Badge>
        );
      },
    },
    {
      key: 'mrp',
      header: 'MRP',
      align: 'right',
      accessor: (med) => (
        <span className="font-mono text-text-secondary">
          {formatCurrency(med.mrp || 0)}
        </span>
      ),
    },
    {
      key: 'defaultSellingPrice',
      header: 'Selling Price',
      align: 'right',
      accessor: (med) => (
        <span className="font-mono font-bold text-text-primary">
          {formatCurrency(med.defaultSellingPrice || 0)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'center',
      render: (med) => {
        if (!canManage && !canDelete) {
          return <span className="text-[10px] text-text-disabled italic">Locked</span>;
        }

        return (
          <div className="flex items-center justify-center gap-1">
            {canManage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenEdit(med)}
                title="Edit Medicine"
                className="w-7 h-7 p-0 text-text-secondary hover:text-accent"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(med)}
                title="Delete Medicine"
                className="w-7 h-7 p-0 text-status-error hover:bg-status-error-bg"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex h-screen bg-surface-page text-text-primary font-sans transition-colors duration-200 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <main className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6 pb-16 lg:pb-0 animate-fade-in">
          {/* Header */}
          <PageHeader
            title="Medicine Master"
            description="Master pharmaceutical catalog, formulations, schedules, packaging units, and standard pricing."
            badge={
              canManage ? (
                <Badge variant="success" size="sm" icon={<ShieldCheck className="w-3 h-3" />}>
                  Manager Access
                </Badge>
              ) : (
                <Badge variant="outline" size="sm" icon={<Lock className="w-3 h-3" />}>
                  Read Only
                </Badge>
              )
            }
            actions={
              canManage ? (
                <Button
                  variant="primary"
                  onClick={handleOpenCreate}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Add Medicine
                </Button>
              ) : undefined
            }
          />

          {/* Filters Bar */}
          <Card elevation="flat" className="p-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 w-full">
                <SmartAutocomplete
                  placeholder="Search Medicine name, Generic, Composition, Barcode, HSN... (First char instant)"
                  value={search}
                  onChange={(val) => {
                    setSearch(val);
                    setPage(1);
                  }}
                  onClear={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  fetchResults={async (q, signal) => {
                    const res = await apiClient.get('/search/medicines', {
                      params: { q, limit: 12 },
                      signal,
                    });
                    const list = res.data || [];
                    return list.map((m: any) => ({
                      id: m.id,
                      title: m.name,
                      subtitle: `${m.genericName || m.brandName || ''} • SKU: ${m.sku}`,
                      badge: m.totalStock > 0 ? `Stock: ${m.totalStock}` : 'No stock',
                      metadata: m,
                    }));
                  }}
                  onSelect={(item) => {
                    setSearch(item.title);
                    if (item.metadata) {
                      handleOpenEdit(item.metadata);
                    }
                  }}
                  createNewAction={{
                    label: 'Add Medicine',
                    onClick: (val) => {
                      setEditingMedicine(null);
                      setFormData((prev) => ({ ...prev, name: val.trim() }));
                      setShowCreateModal(true);
                    },
                  }}
                  inputClassName="!py-2 !text-xs !rounded-lg"
                />
              </div>

              <div className="w-full sm:w-64">
                <Select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  options={[
                    { label: 'All Categories', value: '' },
                    ...categories.map((cat: any) => ({
                      label: cat.name,
                      value: cat.id,
                    })),
                  ]}
                />
              </div>
            </div>
          </Card>

          {/* Medicines Table */}
          <DataTable
            columns={columns}
            data={medicines}
            isLoading={isLoading}
            emptyTitle="No medicines found"
            emptyDescription="There are no items matching your search query or selected category."
            compact
            pagination={{
              page,
              pageSize: 20,
              totalItems: totalMedicines,
              onPageChange: (p) => setPage(p),
            }}
          />
        </main>

        {/* Create / Edit Medicine Modal */}
        {showCreateModal && (
          <Modal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            size="xl"
            title={
              <div className="flex items-center gap-2 text-accent">
                <Pill className="w-5 h-5" />
                <span>{editingMedicine ? 'Edit Medicine Formulation' : 'Add New Medicine Formulation'}</span>
              </div>
            }
            description="Enter brand name, active molecule, dosage format, regulatory schedule, and pricing."
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(formData);
              }}
              className="space-y-4 pt-2"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <Input
                    label="Brand Name / Commercial Title *"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Paracip 500 Tablet"
                  />
                </div>
                <div>
                  <Input
                    label="Parent Brand / Trademark"
                    value={formData.brandName}
                    onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                    placeholder="e.g. Cipla"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <Input
                    label="Generic / Salt Composition *"
                    value={formData.genericName}
                    onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                    placeholder="e.g. Paracetamol IP 500mg"
                  />
                </div>
                <div>
                  <Select
                    label="Category"
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    options={[
                      { label: 'Select Category...', value: '' },
                      ...categories.map((c: any) => ({ label: c.name, value: c.id })),
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <Select
                    label="Dosage Form"
                    value={formData.dosageForm}
                    onChange={(e: any) => setFormData({ ...formData, dosageForm: e.target.value })}
                    options={Object.values(DosageForm).map((df) => ({
                      label: df,
                      value: df,
                    }))}
                  />
                </div>
                <div>
                  <Select
                    label="Base Unit"
                    value={formData.baseUnitId}
                    onChange={(e) => setFormData({ ...formData, baseUnitId: e.target.value })}
                    options={units.map((u: any) => ({
                      label: `${u.name} (${u.abbreviation})`,
                      value: u.id,
                    }))}
                  />
                </div>
                <div>
                  <Input
                    label="SKU Code"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="e.g. PARA-500"
                  />
                </div>
                <div>
                  <Input
                    label="Barcode / EAN"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="8901234567890"
                  />
                </div>
              </div>

              {/* Multi-Level Packaging Units */}
              <Card elevation="flat" className="p-3 bg-surface-raised space-y-2">
                <span className="font-semibold text-text-primary text-xs flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-accent" />
                  Multi-Level Packaging Multipliers (Box ➔ Strip ➔ Tablet)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Strips per Box"
                    type="number"
                    min="1"
                    value={formData.stripsPerBox}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setFormData({ ...formData, stripsPerBox: parseInt(e.target.value) || 1 })}
                  />
                  <Input
                    label="Tablets / Units per Strip"
                    type="number"
                    min="1"
                    value={formData.tabletsPerStrip}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setFormData({ ...formData, tabletsPerStrip: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </Card>

              {/* Regulatory & Prescription Schedule */}
              <Card elevation="flat" className="p-3 bg-surface-raised space-y-2">
                <span className="font-semibold text-text-primary text-xs flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-status-warning" />
                  Drug Schedule &amp; Regulatory Compliance
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <Select
                    label="Drug Schedule"
                    value={formData.drugSchedule}
                    onChange={(e) => {
                      const sched = e.target.value;
                      const isControlled = sched !== 'OTC';
                      setFormData({
                        ...formData,
                        drugSchedule: sched,
                        prescriptionRequired: isControlled ? true : formData.prescriptionRequired,
                      });
                    }}
                    options={[
                      { label: 'OTC (Over The Counter)', value: 'OTC' },
                      { label: 'Schedule H (Prescription Required)', value: 'SCHEDULE_H' },
                      { label: 'Schedule H1 (Controlled Antibiotic / Habit Forming)', value: 'SCHEDULE_H1' },
                      { label: 'Schedule X (Narcotic / Strict Audit)', value: 'SCHEDULE_X' },
                    ]}
                  />

                  <div className="flex items-center gap-2 pt-4">
                    <input
                      type="checkbox"
                      id="rxRequired"
                      checked={formData.prescriptionRequired || formData.drugSchedule !== 'OTC'}
                      disabled={formData.drugSchedule !== 'OTC'}
                      onChange={(e) => setFormData({ ...formData, prescriptionRequired: e.target.checked })}
                      className="w-4 h-4 text-accent border-border rounded focus:ring-accent"
                    />
                    <label htmlFor="rxRequired" className="text-xs font-medium text-text-secondary cursor-pointer select-none">
                      Doctor Prescription Mandatory (Rx Required)
                    </label>
                  </div>
                </div>
              </Card>

              {/* Pricing & GST */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Input
                  label="MRP (₹) *"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.mrp}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setFormData({ ...formData, mrp: parseFloat(e.target.value) || 0 })}
                />
                <Input
                  label="Default Cost Price (₹)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.defaultPurchasePrice}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setFormData({ ...formData, defaultPurchasePrice: parseFloat(e.target.value) || 0 })}
                />
                <Input
                  label="Default Selling Price (₹) *"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.defaultSellingPrice}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setFormData({ ...formData, defaultSellingPrice: parseFloat(e.target.value) || 0 })}
                />
                <Input
                  label="Tax (GST %)"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.taxPercent}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setFormData({ ...formData, taxPercent: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-3">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={createMutation.isPending}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  {createMutation.isPending
                    ? 'Saving...'
                    : editingMedicine
                    ? 'Update Medicine'
                    : 'Save Medicine'}
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </div>
  );
}
