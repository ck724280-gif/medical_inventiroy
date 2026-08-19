'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings as SettingsIcon,
  Palette,
  Building2,
  Printer,
  Database,
  Users,
  Shield,
  Save,
  CheckCircle2,
  Download,
} from 'lucide-react';

import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { apiClient } from '../../lib/api-client';
import { useBrandingStore } from '../../stores/branding-store';
import { PaperWidth } from '@medical-inventory/shared-types';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const fetchBranding = useBrandingStore((s) => s.fetchBranding);
  const [activeTab, setActiveTab] = useState<'business' | 'branding' | 'receipt' | 'branches' | 'backup'>('business');
  const [savedBanner, setSavedBanner] = useState(false);

  // 1. Fetch Business Settings
  const { data: businessData, isLoading: businessLoading } = useQuery({
    queryKey: ['settings-business'],
    queryFn: async () => {
      const res = await apiClient.get('/settings/business');
      return res.data?.data || res.data || {};
    },
  });

  // 2. Fetch Branding Settings
  const { data: brandingData } = useQuery({
    queryKey: ['settings-branding'],
    queryFn: async () => {
      const res = await apiClient.get('/settings/branding');
      return res.data?.data || res.data || {};
    },
  });

  // 3. Fetch Receipt Template
  const { data: receiptData } = useQuery({
    queryKey: ['settings-receipt-template'],
    queryFn: async () => {
      const res = await apiClient.get('/settings/receipt-template');
      return res.data?.data || res.data || {};
    },
  });

  // 4. Fetch Branches
  const { data: branchesData } = useQuery({
    queryKey: ['branches-list'],
    queryFn: async () => {
      const res = await apiClient.get('/branches');
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
  });

  // 5. Fetch Backups
  const { data: backupsData } = useQuery({
    queryKey: ['backup-history'],
    queryFn: async () => {
      const res = await apiClient.get('/backup/history');
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
  });

  const branches = Array.isArray(branchesData) ? branchesData : [];
  const backups = Array.isArray(backupsData) ? backupsData : [];

  // Business Save Mutation
  const saveBusinessMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.patch('/settings/business', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-business'] });
      fetchBranding();
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3000);
    },
  });

  // Branding Save Mutation
  const saveBrandingMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.patch('/settings/branding', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-branding'] });
      fetchBranding();
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3000);
    },
  });

  // Receipt Template Save Mutation
  const saveReceiptMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.patch('/settings/receipt-template', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-receipt-template'] });
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3000);
    },
  });

  // Backup Trigger Mutation
  const backupMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/backup/trigger');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-history'] });
    },
  });

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">System & Store Settings</h2>
              <p className="text-xs text-slate-500">
                Configure legal pharmacy licenses, white-label branding, thermal printer formats, and backups.
              </p>
            </div>

            {savedBanner && (
              <div className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Settings saved successfully!
              </div>
            )}
          </div>

          {/* Settings Tabs */}
          <div className="flex border-b border-slate-200 gap-2">
            {[
              { id: 'business', label: 'Business Profile & Tax', icon: Building2 },
              { id: 'branding', label: 'White-Label Branding', icon: Palette },
              { id: 'receipt', label: 'Thermal Receipt Setup', icon: Printer },
              { id: 'branches', label: 'Store Branches', icon: Building2 },
              { id: 'backup', label: 'Database Backup', icon: Database },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition cursor-pointer border-b-2 ${
                    isActive
                      ? 'bg-white text-sky-600 border-sky-600 shadow-sm'
                      : 'text-slate-500 border-transparent hover:text-slate-800'
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
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-3xl">
              <h3 className="font-bold text-sm text-slate-800 mb-4">Pharmacy Registration & Legal Info</h3>
              <form
                onSubmit={(e: any) => {
                  e.preventDefault();
                  const form = e.target;
                  saveBusinessMutation.mutate({
                    name: form.name.value,
                    phone: form.phone.value,
                    email: form.email.value,
                    address: form.address.value,
                    city: form.city.value,
                    state: form.state.value,
                    pincode: form.pincode.value,
                    gstNumber: form.gstNumber.value,
                    pharmacyLicense: form.pharmacyLicense.value,
                    fssaiNumber: form.fssaiNumber.value,
                    panNumber: form.panNumber.value,
                  });
                }}
                className="space-y-4 text-xs"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Pharmacy / Store Name *</label>
                    <input
                      required
                      name="name"
                      defaultValue={businessData.name || ''}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                    <input
                      name="phone"
                      defaultValue={businessData.phone || ''}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Business Email</label>
                    <input
                      name="email"
                      defaultValue={businessData.email || ''}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Full Store Address</label>
                    <input
                      name="address"
                      defaultValue={businessData.address || ''}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">City</label>
                    <input
                      name="city"
                      defaultValue={businessData.city || ''}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">State / Province</label>
                    <input
                      name="state"
                      defaultValue={businessData.state || ''}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">PIN / ZIP Code</label>
                    <input
                      name="pincode"
                      defaultValue={businessData.pincode || ''}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">GSTIN Number (GST)</label>
                    <input
                      name="gstNumber"
                      defaultValue={businessData.gstNumber || ''}
                      placeholder="27AABCU9603R1ZM"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Pharmacy Drug License # (Form 20B / 21B)
                    </label>
                    <input
                      name="pharmacyLicense"
                      defaultValue={businessData.pharmacyLicense || ''}
                      placeholder="DL-20B-1082"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">FSSAI License #</label>
                    <input
                      name="fssaiNumber"
                      defaultValue={businessData.fssaiNumber || ''}
                      placeholder="10019022009842"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Business PAN #</label>
                    <input
                      name="panNumber"
                      defaultValue={businessData.panNumber || ''}
                      placeholder="AABCU9603R"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={saveBusinessMutation.isPending}
                    className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl shadow flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {saveBusinessMutation.isPending ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: White-Label Branding Form */}
          {activeTab === 'branding' && brandingData && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-3xl">
              <h3 className="font-bold text-sm text-slate-800 mb-4">Color Palette & Brand Identity</h3>
              <form
                onSubmit={(e: any) => {
                  e.preventDefault();
                  const form = e.target;
                  saveBrandingMutation.mutate({
                    primaryColor: form.primaryColor.value,
                    secondaryColor: form.secondaryColor.value,
                    accentColor: form.accentColor.value,
                  });
                }}
                className="space-y-4 text-xs"
              >
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        name="primaryColor"
                        defaultValue={brandingData.primaryColor || '#0284c7'}
                        className="w-10 h-10 border border-slate-300 rounded-lg p-0.5 cursor-pointer"
                      />
                      <span className="font-mono text-slate-600">{brandingData.primaryColor}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Secondary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        name="secondaryColor"
                        defaultValue={brandingData.secondaryColor || '#0f172a'}
                        className="w-10 h-10 border border-slate-300 rounded-lg p-0.5 cursor-pointer"
                      />
                      <span className="font-mono text-slate-600">{brandingData.secondaryColor}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Accent Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        name="accentColor"
                        defaultValue={brandingData.accentColor || '#38bdf8'}
                        className="w-10 h-10 border border-slate-300 rounded-lg p-0.5 cursor-pointer"
                      />
                      <span className="font-mono text-slate-600">{brandingData.accentColor}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={saveBrandingMutation.isPending}
                    className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl shadow flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {saveBrandingMutation.isPending ? 'Saving...' : 'Apply White-Label Theme'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: Thermal Receipt Setup */}
          {activeTab === 'receipt' && receiptData && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-3xl">
              <h3 className="font-bold text-sm text-slate-800 mb-4">Thermal Print Template & Policy Text</h3>
              <form
                onSubmit={(e: any) => {
                  e.preventDefault();
                  const form = e.target;
                  saveReceiptMutation.mutate({
                    headerText: form.headerText.value,
                    footerText: form.footerText.value,
                    thankYouMessage: form.thankYouMessage.value,
                    returnPolicy: form.returnPolicy.value,
                  });
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Top Header Banner Text</label>
                  <input
                    name="headerText"
                    defaultValue={receiptData.headerText || ''}
                    placeholder="e.g. Welcome to MedCare Health Store"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Thank You Note</label>
                  <input
                    name="thankYouMessage"
                    defaultValue={receiptData.thankYouMessage || 'Thank You! Get Well Soon'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Store Return & Drug Policy
                  </label>
                  <textarea
                    name="returnPolicy"
                    rows={2}
                    defaultValue={receiptData.returnPolicy || ''}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={saveReceiptMutation.isPending}
                    className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl shadow flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Template
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: Store Branches */}
          {activeTab === 'branches' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h3 className="font-bold text-sm text-slate-800">Multi-Branch Locations</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {branches.map((b: any) => (
                  <div key={b.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900 text-sm">{b.name}</span>
                      <span className="font-mono bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-bold">
                        {b.code}
                      </span>
                    </div>
                    <p className="text-slate-600">{b.address}, {b.city}</p>
                    <p className="text-slate-500">Phone: {b.phone || 'N/A'}</p>
                    {b.isMain && (
                      <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                        Primary Store
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: Database Backup */}
          {activeTab === 'backup' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5 max-w-3xl">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Database Snapshots & Disaster Recovery</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Generate point-in-time full database backup snapshots.
                  </p>
                </div>
                <button
                  onClick={() => backupMutation.mutate()}
                  disabled={backupMutation.isPending}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow"
                >
                  <Database className="w-3.5 h-3.5" />
                  {backupMutation.isPending ? 'Generating Snapshot...' : 'Create Backup Snapshot'}
                </button>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-xs text-slate-700 block">Backup Snapshot History:</label>
                {backups.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4">No backups created yet.</p>
                ) : (
                  backups.map((b: any) => (
                    <div
                      key={b.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-sky-600" />
                        <div>
                          <p className="font-mono font-bold text-slate-900">{b.filename}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {(b.sizeBytes / 1024).toFixed(1)} KB • Created on {new Date(b.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        {b.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
