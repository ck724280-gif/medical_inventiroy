'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Palette,
  Printer,
  Database,
  CheckCircle2,
  AlertCircle,
  Cloud,
  CloudUpload,
  Download,
  Trash2,
  RefreshCw,
  Server,
  FolderSync,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { apiClient } from '../../lib/api-client';
import { useBrandingStore } from '../../stores/branding-store';
import { PaperWidth } from '@medical-inventory/shared-types';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { fetchBranding } = useBrandingStore();
  const [activeTab, setActiveTab] = useState<'business' | 'branding' | 'receipt' | 'branches' | 'backup'>('business');
  const [savedBanner, setSavedBanner] = useState(false);
  const [gdriveModal, setGdriveModal] = useState(false);
  const [gdriveFolderInput, setGdriveFolderInput] = useState('');
  const [gdriveAutoSync, setGdriveAutoSync] = useState(false);

  // Queries
  const { data: businessData } = useQuery({
    queryKey: ['settings-business'],
    queryFn: async () => (await apiClient.get('/settings/business')).data?.data || (await apiClient.get('/settings/business')).data,
  });

  const { data: brandingData } = useQuery({
    queryKey: ['settings-branding'],
    queryFn: async () => (await apiClient.get('/settings/branding')).data?.data || (await apiClient.get('/settings/branding')).data,
  });

  const { data: receiptData } = useQuery({
    queryKey: ['settings-receipt-template'],
    queryFn: async () => (await apiClient.get('/settings/receipt-template')).data?.data || (await apiClient.get('/settings/receipt-template')).data,
  });

  const { data: branchesData } = useQuery({
    queryKey: ['settings-branches'],
    queryFn: async () => (await apiClient.get('/branches')).data?.data || (await apiClient.get('/branches')).data,
  });

  const { data: backupsData, isLoading: isBackupsLoading } = useQuery({
    queryKey: ['backup-history'],
    queryFn: async () => {
      const res = await apiClient.get('/backup/history');
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
  });

  const { data: backupStats } = useQuery({
    queryKey: ['backup-stats'],
    queryFn: async () => {
      const res = await apiClient.get('/backup/stats');
      return res.data?.data || res.data || {};
    },
  });

  const { data: gdriveConfigData } = useQuery({
    queryKey: ['gdrive-config'],
    queryFn: async () => {
      const res = await apiClient.get('/backup/gdrive-config');
      const cfg = res.data?.data || res.data || {};
      if (cfg.folderId) setGdriveFolderInput(cfg.folderId);
      if (cfg.autoSyncDaily !== undefined) setGdriveAutoSync(cfg.autoSyncDaily);
      return cfg;
    },
  });

  const branches = Array.isArray(branchesData) ? branchesData : [];
  const backups = Array.isArray(backupsData) ? backupsData : [];
  const gdrive = gdriveConfigData || {};

  // Business Save Mutation
  const saveBusinessMutation = useMutation({
    mutationFn: async (payload: any) => apiClient.patch('/settings/business', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-business'] });
      fetchBranding();
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3000);
    },
  });

  // Branding Save Mutation
  const saveBrandingMutation = useMutation({
    mutationFn: async (payload: any) => apiClient.patch('/settings/branding', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-branding'] });
      fetchBranding();
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3000);
    },
  });

  // Receipt Template Save Mutation
  const saveReceiptMutation = useMutation({
    mutationFn: async (payload: any) => apiClient.patch('/settings/receipt-template', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-receipt-template'] });
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3000);
    },
  });

  // Backup Create Mutation
  const createBackupMutation = useMutation({
    mutationFn: async () => apiClient.post('/backup/create'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-history'] });
      queryClient.invalidateQueries({ queryKey: ['backup-stats'] });
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3000);
    },
  });

  // Delete Backup Mutation
  const deleteBackupMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/backup/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-history'] });
    },
  });

  // Google Drive Save Config Mutation
  const saveGdriveConfigMutation = useMutation({
    mutationFn: async (payload: any) => apiClient.post('/backup/gdrive-config', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gdrive-config'] });
      setGdriveModal(false);
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3000);
    },
  });

  // Google Drive Upload Mutation
  const uploadGdriveMutation = useMutation({
    mutationFn: async (id: string) => apiClient.post(`/backup/upload-gdrive/${id}`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['backup-history'] });
      queryClient.invalidateQueries({ queryKey: ['gdrive-config'] });
      alert('Snapshot uploaded to Google Drive folder successfully!');
    },
    onError: () => {
      alert('Google Drive sync failed. Please check folder permissions.');
    },
  });

  const handleDownloadBackup = (id: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://medical-inventory-y445.onrender.com';
    window.open(`${baseUrl}/backup/download/${id}`, '_blank');
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-200">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <main className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">System &amp; Store Settings</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure legal pharmacy licenses, white-label branding, thermal printer formats, and cloud database backups.
              </p>
            </div>

            {savedBanner && (
              <div className="px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Settings saved successfully!
              </div>
            )}
          </div>

          {/* Settings Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto">
            {[
              { id: 'business', label: 'Business Profile & Tax', icon: Building2 },
              { id: 'branding', label: 'White-Label Branding', icon: Palette },
              { id: 'receipt', label: 'Thermal Receipt Setup', icon: Printer },
              { id: 'branches', label: 'Store Branches', icon: Building2 },
              { id: 'backup', label: 'Database Backup & Google Drive', icon: Database },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition cursor-pointer border-b-2 whitespace-nowrap ${
                    isActive
                      ? 'bg-white dark:bg-[#0f172a] text-sky-600 dark:text-sky-400 border-sky-600 dark:border-sky-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: Business Profile Form */}
          {activeTab === 'business' && businessData && (
            <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl p-6 max-w-3xl">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-4">Pharmacy Registration &amp; Legal Info</h3>
              <form
                onSubmit={(e: any) => {
                  e.preventDefault();
                  const fd = new FormData(e.target);
                  saveBusinessMutation.mutate({
                    legalName: fd.get('legalName'),
                    tradeName: fd.get('tradeName'),
                    gstin: fd.get('gstin'),
                    drugLicenseNo: fd.get('drugLicenseNo'),
                    foodSafetyLicense: fd.get('foodSafetyLicense'),
                    contactEmail: fd.get('contactEmail'),
                    contactPhone: fd.get('contactPhone'),
                    addressLine1: fd.get('addressLine1'),
                    city: fd.get('city'),
                    state: fd.get('state'),
                    pincode: fd.get('pincode'),
                  });
                }}
                className="space-y-4 text-xs"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Legal Entity Name</label>
                    <input
                      name="legalName"
                      defaultValue={businessData.legalName}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Trade / Store Name</label>
                    <input
                      name="tradeName"
                      defaultValue={businessData.tradeName}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">GSTIN Number</label>
                    <input
                      name="gstin"
                      defaultValue={businessData.gstin}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Drug License # (Form 20/21)</label>
                    <input
                      name="drugLicenseNo"
                      defaultValue={businessData.drugLicenseNo}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">FSSAI / Food License</label>
                    <input
                      name="foodSafetyLicense"
                      defaultValue={businessData.foodSafetyLicense}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Contact Email</label>
                    <input
                      name="contactEmail"
                      defaultValue={businessData.contactEmail}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Store Phone / Mobile</label>
                    <input
                      name="contactPhone"
                      defaultValue={businessData.contactPhone}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Address Line</label>
                  <input
                    name="addressLine1"
                    defaultValue={businessData.addressLine1}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">City</label>
                    <input
                      name="city"
                      defaultValue={businessData.city}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">State</label>
                    <input
                      name="state"
                      defaultValue={businessData.state}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">PIN Code</label>
                    <input
                      name="pincode"
                      defaultValue={businessData.pincode}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                  <button
                    type="submit"
                    disabled={saveBusinessMutation.isPending}
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold shadow transition cursor-pointer"
                  >
                    Save Business Info
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: White-Label Branding */}
          {activeTab === 'branding' && brandingData && (
            <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl p-6 max-w-3xl space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Custom Brand Identity &amp; Accent Color</h3>
              <form
                onSubmit={(e: any) => {
                  e.preventDefault();
                  const fd = new FormData(e.target);
                  saveBrandingMutation.mutate({
                    appName: fd.get('appName'),
                    tagline: fd.get('tagline'),
                    logoUrl: fd.get('logoUrl'),
                    primaryColor: fd.get('primaryColor'),
                    supportEmail: fd.get('supportEmail'),
                    supportPhone: fd.get('supportPhone'),
                  });
                }}
                className="space-y-4 text-xs"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Application Name</label>
                    <input
                      name="appName"
                      defaultValue={brandingData.appName}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Tagline</label>
                    <input
                      name="tagline"
                      defaultValue={brandingData.tagline}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Logo URL</label>
                  <input
                    name="logoUrl"
                    defaultValue={brandingData.logoUrl}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Primary Color Hex</label>
                    <input
                      name="primaryColor"
                      defaultValue={brandingData.primaryColor || '#0284c7'}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Support Email</label>
                    <input
                      name="supportEmail"
                      defaultValue={brandingData.supportEmail}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Support Phone</label>
                    <input
                      name="supportPhone"
                      defaultValue={brandingData.supportPhone}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                  <button
                    type="submit"
                    disabled={saveBrandingMutation.isPending}
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold shadow transition cursor-pointer"
                  >
                    Save Branding
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: Thermal Receipt Setup */}
          {activeTab === 'receipt' && receiptData && (
            <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl p-6 max-w-3xl space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Thermal Receipt Customizer</h3>
              <form
                onSubmit={(e: any) => {
                  e.preventDefault();
                  const fd = new FormData(e.target);
                  saveReceiptMutation.mutate({
                    paperWidth: fd.get('paperWidth'),
                    showGstin: fd.get('showGstin') === 'on',
                    showDrugLicense: fd.get('showDrugLicense') === 'on',
                    showDoctorInfo: fd.get('showDoctorInfo') === 'on',
                    showCustomerBalance: fd.get('showCustomerBalance') === 'on',
                    headerText: fd.get('headerText'),
                    footerText: fd.get('footerText'),
                    termsAndConditions: fd.get('termsAndConditions'),
                  });
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Printer Roll Size</label>
                  <select
                    name="paperWidth"
                    defaultValue={receiptData.paperWidth}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="WIDTH_80MM">80mm (Standard Desktop Thermal POS)</option>
                    <option value="WIDTH_58MM">58mm (Handheld / Bluetooth Mobile POS)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-[#090d16] rounded-xl border border-slate-200 dark:border-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      name="showGstin"
                      defaultChecked={receiptData.showGstin}
                      className="rounded text-sky-600"
                    />
                    <span>Print Store GSTIN</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      name="showDrugLicense"
                      defaultChecked={receiptData.showDrugLicense}
                      className="rounded text-sky-600"
                    />
                    <span>Print Drug License #</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      name="showDoctorInfo"
                      defaultChecked={receiptData.showDoctorInfo}
                      className="rounded text-sky-600"
                    />
                    <span>Print Prescribing Doctor / Rx Details</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      name="showCustomerBalance"
                      defaultChecked={receiptData.showCustomerBalance}
                      className="rounded text-sky-600"
                    />
                    <span>Print Outstanding Customer Ledger Balance</span>
                  </label>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Header Welcome Text</label>
                  <input
                    name="headerText"
                    defaultValue={receiptData.headerText}
                    placeholder="Welcome to MedCare Pharmacy"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Footer Greeting / Return Policy</label>
                  <textarea
                    name="footerText"
                    defaultValue={receiptData.footerText}
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                  <button
                    type="submit"
                    disabled={saveReceiptMutation.isPending}
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold shadow transition cursor-pointer"
                  >
                    Save Template
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: Store Branches */}
          {activeTab === 'branches' && (
            <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl p-6 space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Multi-Branch Locations</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {branches.map((b: any) => (
                  <div key={b.id} className="p-4 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{b.name}</span>
                      <span className="font-mono bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 px-2 py-0.5 rounded font-bold">
                        {b.code}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">{b.address}, {b.city}</p>
                    <p className="text-slate-500 dark:text-slate-400">Phone: {b.phone || 'N/A'}</p>
                    {b.isMain && (
                      <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-full font-bold text-[10px]">
                        Primary Store
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: Database Backup & Google Drive */}
          {activeTab === 'backup' && (
            <div className="space-y-6 max-w-4xl">
              {/* Top Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-[#0f172a] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Server Storage</span>
                    <Server className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white font-mono">{backups.length} Snapshots</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Point-in-time database records ready on server.</p>
                </div>

                <div className="bg-white dark:bg-[#0f172a] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Google Drive Cloud</span>
                    <Cloud className={`w-5 h-5 ${gdrive.connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-1.5 font-mono">
                    {gdrive.connected ? 'Connected' : 'Not Linked'}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {gdrive.connected ? `Folder: ${gdrive.folderName}` : 'Connect Google Drive for offsite cloud sync.'}
                  </p>
                </div>

                <div className="bg-white dark:bg-[#0f172a] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Database Volume</span>
                    <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                    {backupStats.sales || 0} Bills • {backupStats.medicines || 0} Items
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">15 tables secured across all branches.</p>
                </div>
              </div>

              {/* Action Bar & Google Drive Connection Box */}
              <div className="bg-white dark:bg-[#0f172a] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Create Immediate Database Backup</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Generates a verified snapshot including medicines, batches, sales, ledger entries, and tax receipts.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => setGdriveModal(true)}
                      className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                    >
                      <Cloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Google Drive Setup
                    </button>

                    <button
                      onClick={() => createBackupMutation.mutate()}
                      disabled={createBackupMutation.isPending}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-sky-600/20 transition cursor-pointer disabled:opacity-50"
                    >
                      <Database className="w-4 h-4" />
                      {createBackupMutation.isPending ? 'Generating Backup...' : 'Create Backup Snapshot'}
                    </button>
                  </div>
                </div>

                {/* Google Drive Status Bar */}
                <div className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
                  gdrive.connected
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                    : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <FolderSync className={`w-5 h-5 ${gdrive.connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                    <div>
                      <p className="font-bold">
                        {gdrive.connected ? 'Google Drive Cloud Sync Active' : 'Google Drive Disconnected'}
                      </p>
                      <p className="text-[11px] opacity-80">
                        {gdrive.connected
                          ? `Destination: Google Drive / ${gdrive.folderName} (Auto-sync: ${gdrive.autoSyncDaily ? 'Daily ON' : 'Manual'})`
                          : 'Connect your Google Drive folder to auto-backup data without manual downloads.'}
                      </p>
                    </div>
                  </div>

                  {gdrive.connected && (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-bold text-[10px]">
                      🟢 Cloud Ready
                    </span>
                  )}
                </div>

                {/* Snapshots Table */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      Saved Backup Snapshots ({backups.length})
                    </label>
                    <button
                      onClick={() => queryClient.invalidateQueries({ queryKey: ['backup-history'] })}
                      className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Refresh
                    </button>
                  </div>

                  {isBackupsLoading ? (
                    <p className="text-xs text-slate-400 py-6 text-center">Loading backup archives...</p>
                  ) : backups.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-[#090d16] rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <Database className="w-8 h-8 text-slate-400 mx-auto stroke-1" />
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No backup snapshots generated yet.</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Click "Create Backup Snapshot" to create your first full database backup.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left text-xs min-w-[650px]">
                        <thead className="bg-slate-100/80 dark:bg-[#0c1322] text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase">
                          <tr>
                            <th className="py-2.5 px-3">Snapshot Name</th>
                            <th className="py-2.5 px-3">Size</th>
                            <th className="py-2.5 px-3">Timestamp</th>
                            <th className="py-2.5 px-3 text-center">Drive Cloud</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-[#0f172a]">
                          {backups.map((b: any) => (
                            <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="py-2.5 px-3">
                                <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <Database className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                                  <span>{b.filename}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">ID: {b.id}</span>
                              </td>
                              <td className="py-2.5 px-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                                {(b.sizeBytes / 1024).toFixed(1)} KB
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                                {new Date(b.createdAt).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {b.gdriveStatus === 'SYNCED' ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
                                    <Cloud className="w-3 h-3" /> Synced
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                    Local Only
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleDownloadBackup(b.id)}
                                    title="Download JSON Snapshot to PC"
                                    className="p-1.5 bg-sky-50 dark:bg-slate-800 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-slate-700 rounded-lg transition"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => uploadGdriveMutation.mutate(b.id)}
                                    disabled={uploadGdriveMutation.isPending}
                                    title="Upload directly to Google Drive"
                                    className="p-1.5 bg-emerald-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-slate-700 rounded-lg transition"
                                  >
                                    <CloudUpload className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => {
                                      if (confirm(`Delete backup snapshot "${b.filename}"?`)) {
                                        deleteBackupMutation.mutate(b.id);
                                      }
                                    }}
                                    title="Delete from Server"
                                    className="p-1.5 bg-red-50 dark:bg-slate-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-slate-700 rounded-lg transition"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Google Drive Configuration Modal */}
              {gdriveModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4 text-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <Cloud className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">Google Drive Integration</h3>
                      </div>
                      <button onClick={() => setGdriveModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        ✕
                      </button>
                    </div>

                    <p className="text-slate-600 dark:text-slate-400">
                      Configure your Google Drive folder where automated database snapshots will be securely mirrored.
                    </p>

                    <div className="space-y-3">
                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Google Drive Folder Name / ID
                        </label>
                        <input
                          type="text"
                          value={gdriveFolderInput}
                          onChange={(e) => setGdriveFolderInput(e.target.value)}
                          placeholder="e.g. MedCare_Pharmacy_Backups"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 font-mono text-xs"
                        />
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-[#090d16] rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800 dark:text-slate-200">
                          <input
                            type="checkbox"
                            checked={gdriveAutoSync}
                            onChange={(e) => setGdriveAutoSync(e.target.checked)}
                            className="rounded text-sky-600"
                          />
                          <span>Auto-Sync to Google Drive on every backup</span>
                        </label>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 pl-6">
                          Whenever a new backup is created, it will automatically sync to your cloud folder.
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setGdriveModal(false)}
                        className="px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          saveGdriveConfigMutation.mutate({
                            folderId: gdriveFolderInput || 'MedCare_Backups_Folder',
                            folderName: gdriveFolderInput || 'MedCare_Pharmacy_Backups',
                            autoSyncDaily: gdriveAutoSync,
                            connected: true,
                          })
                        }
                        disabled={saveGdriveConfigMutation.isPending}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold shadow transition cursor-pointer"
                      >
                        Connect &amp; Save Drive
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
