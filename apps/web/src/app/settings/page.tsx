'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Plus,
  Edit2,
  X,
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
  Users,
  UserPlus,
  Key,
  Shield,
  Upload,
  Loader2,
  Sparkles,
  Bot,
  Eye,
  EyeOff,
  Sliders,
  Zap,
} from 'lucide-react';
import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { PageHeader } from '../../components/ui/page-header';
import { apiClient } from '../../lib/api-client';
import { useBrandingStore } from '../../stores/branding-store';
import { PrintStudioCustomizer } from '../../components/print-studio-customizer';
import { PaperWidth } from '@medical-inventory/shared-types';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { fetchBranding, updateLogoImmediately, logo: currentStoreLogo } = useBrandingStore();
  const [activeTab, setActiveTab] = useState<'business' | 'branding' | 'receipt' | 'branches' | 'staff' | 'backup' | 'ai'>('business');
  const [savedBanner, setSavedBanner] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [aiForm, setAiForm] = useState({
    geminiApiKey: '',
    aiModelName: 'gemini-1.5-flash',
    aiEnabled: true,
    aiTemperature: 0.2,
    aiSystemPrompt: '',
  });

  const [gdriveModal, setGdriveModal] = useState(false);
  const [gdriveFolderInput, setGdriveFolderInput] = useState('');
  const [gdriveAutoSync, setGdriveAutoSync] = useState(false);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any | null>(null);
  const [branchForm, setBranchForm] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    phone: '',
    email: '',
    isDefault: false,
    isActive: true,
  });

  const [retentionDays, setRetentionDays] = useState<number>(7);
  const [serviceAccountInput, setServiceAccountInput] = useState('');
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [staffSearch, setStaffSearch] = useState('');
  const [staffBranchFilter, setStaffBranchFilter] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState('');
  const [staffForm, setStaffForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    password: '',
    roleId: '',
    branchId: '',
    isActive: true,
  });

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

  const { data: aiConfigData } = useQuery({
    queryKey: ['settings-ai-config'],
    queryFn: async () => {
      const res = await apiClient.get('/settings/ai-config');
      const data = res.data?.data || res.data || {};
      setAiForm({
        geminiApiKey: data.geminiApiKey || '',
        aiModelName: data.aiModelName || 'gemini-1.5-flash',
        aiEnabled: data.aiEnabled !== false,
        aiTemperature: data.aiTemperature ?? 0.2,
        aiSystemPrompt: data.aiSystemPrompt || '',
      });
      return data;
    },
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
      if (cfg.retentionDays !== undefined) setRetentionDays(cfg.retentionDays);
      return cfg;
    },
  });

  const branches = Array.isArray(branchesData) ? branchesData : [];
  const backups = Array.isArray(backupsData) ? backupsData : [];
  const gdrive = gdriveConfigData || {};

  // Queries for Users and Roles
  const { data: usersData, isLoading: isUsersLoading } = useQuery({
    queryKey: ['settings-users', staffBranchFilter, staffSearch],
    queryFn: async () => {
      const res = await apiClient.get('/users', {
        params: {
          branchId: staffBranchFilter || undefined,
          search: staffSearch || undefined,
          limit: 100,
        },
      });
      return res.data?.data || res.data || [];
    },
  });

  const { data: rolesData } = useQuery({
    queryKey: ['settings-roles'],
    queryFn: async () => {
      const res = await apiClient.get('/roles');
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
  });

  const staffUsers = Array.isArray(usersData) ? usersData : [];
  const allRoles = Array.isArray(rolesData) ? rolesData : [];

  // Branch Mutations
  const saveBranchMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingBranch) {
        return apiClient.patch(`/branches/${editingBranch.id}`, payload);
      }
      return apiClient.post('/branches', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-branches'] });
      setBranchModalOpen(false);
      setEditingBranch(null);
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3000);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to save store branch.');
    },
  });

  const deleteBranchMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/branches/${id}`);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['settings-branches'] });
      alert(res.data?.message || 'Branch removed successfully.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete branch.');
    },
  });

  // Staff Mutations
  const saveStaffMutation = useMutation({
    mutationFn: async (payload: any) => {
      const body: any = {
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        mobile: payload.mobile || undefined,
        isActive: payload.isActive,
        roleIds: payload.roleId ? [payload.roleId] : undefined,
        branchIds: payload.branchId ? [payload.branchId] : undefined,
      };
      if (payload.password) {
        body.password = payload.password;
      }
      if (editingStaff) {
        return apiClient.patch(`/users/${editingStaff.id}`, body);
      }
      return apiClient.post('/users', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-users'] });
      setStaffModalOpen(false);
      setEditingStaff(null);
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3000);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to save staff user.');
    },
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-users'] });
      alert('Staff user deactivated successfully.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to deactivate user.');
    },
  });

  const handleOpenAddStaff = (presetBranchId?: string) => {
    setEditingStaff(null);
    const defaultBranchId = presetBranchId || (branches.length > 0 ? branches[0].id : '');
    const defaultRoleId = allRoles.find((r: any) => r.name === 'CASHIER')?.id || (allRoles[0]?.id || '');
    setStaffForm({
      firstName: '',
      lastName: '',
      email: '',
      mobile: '',
      password: '',
      roleId: defaultRoleId,
      branchId: defaultBranchId,
      isActive: true,
    });
    setStaffModalOpen(true);
  };

  const handleOpenEditStaff = (user: any) => {
    setEditingStaff(user);
    const userRoleId = user.roles && user.roles.length > 0 ? user.roles[0].id : '';
    const userBranchId = user.branches && user.branches.length > 0 ? user.branches[0].id : '';
    setStaffForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      mobile: user.mobile || '',
      password: '',
      roleId: userRoleId,
      branchId: userBranchId,
      isActive: user.isActive ?? true,
    });
    setStaffModalOpen(true);
  };

  const handleDeleteStaff = (user: any) => {
    if (confirm(`Are you sure you want to deactivate ${user.firstName} ${user.lastName} (${user.email})?`)) {
      deleteStaffMutation.mutate(user.id);
    }
  };

  const handleOpenAddBranch = () => {
    setEditingBranch(null);
    setBranchForm({
      name: '',
      code: `BR-${(branches.length + 1).toString().padStart(2, '0')}`,
      address: '',
      city: '',
      state: '',
      phone: '',
      email: '',
      isDefault: branches.length === 0,
      isActive: true,
    });
    setBranchModalOpen(true);
  };

  const handleOpenEditBranch = (b: any) => {
    setEditingBranch(b);
    setBranchForm({
      name: b.name || '',
      code: b.code || '',
      address: b.address || '',
      city: b.city || '',
      state: b.state || '',
      phone: b.phone || '',
      email: b.email || '',
      isDefault: b.isDefault || false,
      isActive: b.isActive ?? true,
    });
    setBranchModalOpen(true);
  };

  const handleDeleteBranch = (b: any) => {
    if (b.isDefault) {
      alert('Cannot delete the primary default store branch.');
      return;
    }
    if (confirm(`Are you sure you want to delete or deactivate branch "${b.name}" (${b.code})?`)) {
      deleteBranchMutation.mutate(b.id);
    }
  };

  const uploadLogoMutation = useMutation({
    mutationFn: async (logoBase64: string) => apiClient.post('/settings/logo', { logo: logoBase64 }),
    onSuccess: (res: any) => {
      const newLogo = res.data?.logoUrl || res.data?.data?.logoUrl || '';
      updateLogoImmediately(newLogo);
      fetchBranding();
      queryClient.invalidateQueries({ queryKey: ['settings-business'] });
      queryClient.invalidateQueries({ queryKey: ['settings-branding'] });
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3000);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to upload logo.');
    },
  });

  const saveBusinessMutation = useMutation({
    mutationFn: async (payload: any) => apiClient.patch('/settings/business', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-business'] });
      fetchBranding();
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3000);
    },
  });

  const saveBrandingMutation = useMutation({
    mutationFn: async (payload: any) => apiClient.patch('/settings/branding', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-branding'] });
      fetchBranding();
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3000);
    },
  });

  const saveReceiptMutation = useMutation({
    mutationFn: async (payload: any) => apiClient.patch('/settings/receipt-template', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-receipt-template'] });
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3000);
    },
  });

  const saveAiConfigMutation = useMutation({
    mutationFn: async (payload: any) => apiClient.patch('/settings/ai-config', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-ai-config'] });
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3000);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to save AI configuration.');
    },
  });

  const testAiConnectionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/settings/ai-config/test-connection', payload);
      return res.data?.data || res.data;
    },
    onSuccess: (data) => {
      setTestResult(data);
    },
    onError: (err: any) => {
      setTestResult({
        success: false,
        status: 'FAILED',
        error: err.response?.data?.message || err.message || 'Connection failed',
      });
    },
  });

  const createBackupMutation = useMutation({
    mutationFn: async () => apiClient.post('/backup/create'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-history'] });
      queryClient.invalidateQueries({ queryKey: ['backup-stats'] });
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3000);
    },
  });

  const deleteBackupMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/backup/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-history'] });
    },
  });

  const saveGdriveConfigMutation = useMutation({
    mutationFn: async (payload: any) => apiClient.post('/backup/gdrive-config', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gdrive-config'] });
      setGdriveModal(false);
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3000);
    },
  });

  const uploadGdriveMutation = useMutation({
    mutationFn: async (id: string) => apiClient.post(`/backup/upload-gdrive/${id}`),
    onSuccess: () => {
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
    <div className="flex h-screen bg-surface-page text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-200">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <main className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-text-primary tracking-tight">System &amp; Store Settings</h2>
              <p className="text-xs text-text-muted mt-0.5">
                Configure legal pharmacy licenses, white-label branding, thermal printer formats, AI Co-Pilot API keys, and cloud database backups.
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
          <div className="flex border-b border-border-default gap-2 overflow-x-auto">
            {[
              { id: 'business', label: 'Business Profile & Tax', icon: Building2 },
              { id: 'branding', label: 'White-Label Branding', icon: Palette },
              { id: 'receipt', label: 'Thermal & Universal Print Setup', icon: Printer },
              { id: 'ai', label: 'AI Co-Pilot & Chatbot API', icon: Sparkles },
              { id: 'branches', label: 'Store Branches', icon: Building2 },
              { id: 'staff', label: 'Branch Staff & Roles', icon: Users },
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
                      ? 'bg-surface-base text-accent-primary border-sky-600 dark:border-sky-400 shadow-sm'
                      : 'text-text-muted border-transparent hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: Business Profile & Tax Settings */}
          {activeTab === 'business' && businessData && (
            <div className="bg-surface-base rounded-2xl border border-border-default shadow-sm dark:shadow-xl p-6 max-w-4xl space-y-6">
              <div>
                <h3 className="font-bold text-base text-text-primary">Pharmacy Profile &amp; Store Information</h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Update your medical store name, branding logo, tax details (GSTIN), and drug inspector compliance licenses.
                </p>
              </div>

              <form
                onSubmit={(e: any) => {
                  e.preventDefault();
                  const fd = new FormData(e.target);
                  saveBusinessMutation.mutate({
                    name: fd.get('name'),
                    logo: fd.get('logo') || null,
                    description: fd.get('description'),
                    phone: fd.get('phone'),
                    altPhone: fd.get('altPhone'),
                    email: fd.get('email'),
                    website: fd.get('website'),
                    address: fd.get('address'),
                    city: fd.get('city'),
                    state: fd.get('state'),
                    country: fd.get('country') || 'India',
                    pinZip: fd.get('pinZip'),
                    gstNumber: fd.get('gstNumber'),
                    pharmacyLicense: fd.get('pharmacyLicense'),
                    currencySymbol: fd.get('currencySymbol') || '₹',
                    dateFormat: fd.get('dateFormat') || 'DD-MM-YYYY',
                    timezone: fd.get('timezone') || 'Asia/Kolkata',
                  });
                }}
                className="space-y-6 text-xs"
              >
                {/* ── 1. Store Logo & Brand Icon ───────────────────── */}
                <div className="p-4 bg-surface-page rounded-2xl border border-border-default flex flex-wrap items-center gap-5">
                  <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden shadow-inner flex-shrink-0 relative group">
                    {(currentStoreLogo || businessData.logo) ? (
                      <img
                        id="logo-preview-img"
                        src={currentStoreLogo || businessData.logo}
                        alt="Store Logo"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <div id="logo-preview-img" className="text-2xl font-extrabold text-accent-primary">
                        {businessData.name ? businessData.name.charAt(0).toUpperCase() : '+'}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 flex-1 min-w-[240px]">
                    <div className="flex items-center gap-2">
                      <label className="px-3.5 py-1.5 bg-accent-primary hover:bg-accent-hover text-white rounded-xl font-semibold transition text-xs flex items-center gap-1.5 cursor-pointer shadow-sm">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadLogoMutation.isPending ? 'Uploading...' : 'Upload Store Logo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadLogoMutation.isPending}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 2 * 1024 * 1024) {
                              alert('Image size exceeds 2MB limit. Please choose a smaller image.');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const base64 = event.target?.result as string;
                              updateLogoImmediately(base64);
                              uploadLogoMutation.mutate(base64);
                              const input = document.getElementById('logo-url-input') as HTMLInputElement;
                              if (input) input.value = base64;
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          updateLogoImmediately('');
                          uploadLogoMutation.mutate('');
                          const input = document.getElementById('logo-url-input') as HTMLInputElement;
                          if (input) input.value = '';
                        }}
                        className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-text-secondary rounded-xl font-semibold transition text-xs flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove Logo
                      </button>
                    </div>

                    <input
                      id="logo-url-input"
                      name="logo"
                      type="hidden"
                      defaultValue={currentStoreLogo || businessData.logo || ''}
                    />
                  </div>
                </div>

                {/* ── 2. Pharmacy Basic Information ─────────────────── */}
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-text-primary border-b border-slate-100 dark:border-slate-800 pb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-sky-600" />
                    Store &amp; Pharmacy Identity
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="font-semibold text-text-secondary block mb-1">
                        Pharmacy / Store Trade Name *
                      </label>
                      <input
                        name="name"
                        required
                        defaultValue={businessData.name}
                        placeholder="e.g. MedCare Pharmacy & Healthcare"
                        className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary font-medium focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-text-secondary block mb-1">
                        Tagline / Store Description
                      </label>
                      <input
                        name="description"
                        defaultValue={businessData.description || ''}
                        placeholder="e.g. 24x7 Authentic Medicines & Diagnostic Care"
                        className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>

                {/* ── 3. Legal Licenses & Tax Information ──────────── */}
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-text-primary border-b border-slate-100 dark:border-slate-800 pb-1.5 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Tax (GSTIN) &amp; Drug Licenses Compliance
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="font-semibold text-text-secondary block mb-1">
                        GSTIN Registration Number (15 Digits)
                      </label>
                      <input
                        name="gstNumber"
                        defaultValue={businessData.gstNumber || ''}
                        placeholder="22AAAAA0000A1Z5"
                        maxLength={15}
                        className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl font-mono text-text-primary focus:outline-none focus:border-sky-500 uppercase"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-text-secondary block mb-1">
                        Drug License # (Form 20B / Form 21B Retail D.L.)
                      </label>
                      <input
                        name="pharmacyLicense"
                        defaultValue={businessData.pharmacyLicense || ''}
                        placeholder="DL-20B-12345 / DL-21B-12345"
                        className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl font-mono text-text-primary focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>

                {/* ── 4. Contact Details ─────────────────────────────── */}
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-text-primary border-b border-slate-100 dark:border-slate-800 pb-1.5">
                    Contact &amp; Communication Channels
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="font-semibold text-text-secondary block mb-1">
                        Primary Phone / Mobile
                      </label>
                      <input
                        name="phone"
                        defaultValue={businessData.phone || ''}
                        placeholder="+91 98765 43210"
                        className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-text-secondary block mb-1">
                        Alternate / WhatsApp Phone
                      </label>
                      <input
                        name="altPhone"
                        defaultValue={businessData.altPhone || ''}
                        placeholder="+91 98765 00000"
                        className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-text-secondary block mb-1">
                        Official Contact Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        defaultValue={businessData.email || ''}
                        placeholder="pharmacy@example.com"
                        className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-text-secondary block mb-1">
                        Store Website / Web Link
                      </label>
                      <input
                        name="website"
                        defaultValue={businessData.website || ''}
                        placeholder="https://www.medcarepharmacy.com"
                        className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>

                {/* ── 5. Physical Store Address ─────────────────────── */}
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-text-primary border-b border-slate-100 dark:border-slate-800 pb-1.5">
                    Physical Store Address
                  </h4>

                  <div>
                    <label className="font-semibold text-text-secondary block mb-1">
                      Street Address / Building / Market
                    </label>
                    <input
                      name="address"
                      defaultValue={businessData.address || ''}
                      placeholder="Shop No. 4, Ground Floor, Medical Market, Main Road"
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="font-semibold text-text-secondary block mb-1">City</label>
                      <input
                        name="city"
                        defaultValue={businessData.city || ''}
                        placeholder="City"
                        className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-text-secondary block mb-1">State</label>
                      <input
                        name="state"
                        defaultValue={businessData.state || ''}
                        placeholder="State"
                        className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-text-secondary block mb-1">PIN / Postal Code</label>
                      <input
                        name="pinZip"
                        defaultValue={businessData.pinZip || ''}
                        placeholder="560001"
                        className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl font-mono text-text-primary focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-text-secondary block mb-1">Currency Symbol</label>
                      <input
                        name="currencySymbol"
                        defaultValue={businessData.currencySymbol || '₹'}
                        placeholder="₹"
                        className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl font-bold font-mono text-text-primary focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border-default flex justify-end">
                  <button
                    type="submit"
                    disabled={saveBusinessMutation.isPending}
                    className="px-6 py-2.5 bg-accent-primary hover:bg-accent-hover text-white rounded-xl font-bold shadow-md shadow-sky-600/20 transition cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {saveBusinessMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {saveBusinessMutation.isPending ? 'Saving...' : 'Save Business & Tax Info'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: White-Label Branding */}
          {activeTab === 'branding' && brandingData && (
            <div className="bg-surface-base rounded-2xl border border-border-default shadow-sm dark:shadow-xl p-6 max-w-3xl space-y-4">
              <h3 className="font-bold text-sm text-text-primary">Custom Brand Identity &amp; Accent Color</h3>
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
                    <label className="font-semibold text-text-secondary block mb-1">Application Name</label>
                    <input
                      name="appName"
                      defaultValue={brandingData.appName}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-text-secondary block mb-1">Tagline</label>
                    <input
                      name="tagline"
                      defaultValue={brandingData.tagline}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-text-secondary block mb-1">Logo URL</label>
                  <input
                    name="logoUrl"
                    defaultValue={brandingData.logoUrl}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="font-semibold text-text-secondary block mb-1">Primary Color Hex</label>
                    <input
                      name="primaryColor"
                      defaultValue={brandingData.primaryColor || '#0284c7'}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl font-mono text-text-primary focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-text-secondary block mb-1">Support Email</label>
                    <input
                      name="supportEmail"
                      defaultValue={brandingData.supportEmail}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-text-secondary block mb-1">Support Phone</label>
                    <input
                      name="supportPhone"
                      defaultValue={brandingData.supportPhone}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-border-default flex justify-end">
                  <button
                    type="submit"
                    disabled={saveBrandingMutation.isPending}
                    className="px-5 py-2 bg-accent-primary hover:bg-accent-hover text-white rounded-xl font-semibold shadow transition cursor-pointer"
                  >
                    Save Branding
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: Universal Thermal & Invoice Print Engine */}
          {activeTab === 'receipt' && receiptData && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-base text-text-primary flex items-center gap-2">
                    <Printer className="w-5 h-5 text-accent-primary" />
                    Universal Receipt &amp; Invoice Print Studio
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Customize bill layouts across 4 paper sizes (58mm, 80mm, A5, A4) with 20 professional themes and real-time simulator.
                  </p>
                </div>
              </div>

              <PrintStudioCustomizer
                initialData={receiptData}
                businessData={businessData}
                onSave={(payload) => saveReceiptMutation.mutate(payload)}
                isSaving={saveReceiptMutation.isPending}
              />
            </div>
          )}

          {/* TAB: AI Co-Pilot & Chatbot API Configuration (§P7) */}
          {activeTab === 'ai' && (
            <div className="bg-surface-base rounded-2xl border border-border-default shadow-sm dark:shadow-xl p-6 max-w-4xl space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border-default">
                <div>
                  <h3 className="font-bold text-base text-text-primary flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-accent-primary" />
                    AI Co-Pilot &amp; Autonomous Chatbot Configuration (§P7)
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Configure your Google Gemini API Key, select AI reasoning model, set temperature, and test live connection.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                    aiConfigData?.hasKey
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  }`}>
                    {aiConfigData?.hasKey ? '🟢 API Key Active' : '⚠️ Fallback Local Mode'}
                  </span>
                </div>
              </div>

              {/* Status & Test Card */}
              {testResult && (
                <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 animate-fade-in ${
                  testResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200'
                }`}>
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">
                        {testResult.success ? 'Gemini API Connection Verified!' : 'API Connection Failed'}
                      </span>
                      {testResult.latencyMs && (
                        <span className="font-mono text-[11px] bg-emerald-100 dark:bg-emerald-900 px-2 py-0.5 rounded text-emerald-800 dark:text-emerald-200">
                          ⚡ {testResult.latencyMs}ms Latency
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] opacity-90">
                      {testResult.success
                        ? `Successfully pinged model '${testResult.model}'. Response: "${testResult.response}"`
                        : `Error: ${testResult.error}`}
                    </p>
                  </div>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveAiConfigMutation.mutate(aiForm);
                }}
                className="space-y-5 text-xs"
              >
                {/* 1. Gemini API Key */}
                <div className="p-4 bg-surface-page rounded-xl border border-border-default space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-text-primary flex items-center gap-1.5">
                      <Key className="w-4 h-4 text-accent-primary" />
                      Google Gemini API Key
                    </label>
                    <span className="text-[11px] text-text-muted">
                      Get key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-accent-primary underline">Google AI Studio</a>
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={aiForm.geminiApiKey}
                      onChange={(e) => setAiForm({ ...aiForm, geminiApiKey: e.target.value })}
                      placeholder="Paste your Gemini API key (e.g. AIzaSy...)"
                      className="w-full px-3.5 py-2.5 bg-surface-base border border-border-strong rounded-xl font-mono text-text-primary focus:outline-none focus:border-sky-500 pr-10 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-2.5 text-text-muted hover:text-text-primary"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-text-muted">
                    Your API key is securely encrypted on the server and used to execute Super Admin Co-Pilot queries and natural-language actions.
                  </p>
                </div>

                {/* 2. Model & Generation Parameters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-surface-page rounded-xl border border-border-default space-y-2">
                    <label className="font-bold text-text-primary block">
                      AI Model Engine
                    </label>
                    <select
                      value={aiForm.aiModelName}
                      onChange={(e) => setAiForm({ ...aiForm, aiModelName: e.target.value })}
                      className="w-full px-3 py-2 bg-surface-base border border-border-strong rounded-xl text-text-primary font-bold focus:outline-none focus:border-sky-500 text-xs"
                    >
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash (Ultra Fast, Recommended)</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Reasoning &amp; Complex Analysis)</option>
                      <option value="gemini-2.0-flash">Gemini 2.0 Flash (Next-Gen Realtime)</option>
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash (Latest Experimental)</option>
                    </select>
                    <p className="text-[11px] text-text-muted">
                      Controls the LLM engine for intent extraction, report summarization, and action proposals.
                    </p>
                  </div>

                  <div className="p-4 bg-surface-page rounded-xl border border-border-default space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-text-primary">
                        Temperature ({aiForm.aiTemperature})
                      </label>
                      <span className="text-[11px] text-text-muted">
                        {aiForm.aiTemperature <= 0.3 ? 'Deterministic & Precise' : 'Creative'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={aiForm.aiTemperature}
                      onChange={(e) => setAiForm({ ...aiForm, aiTemperature: parseFloat(e.target.value) })}
                      className="w-full accent-sky-600"
                    />
                    <p className="text-[11px] text-text-muted">
                      Lower values (0.1 - 0.3) provide exact mathematical and inventory consistency.
                    </p>
                  </div>
                </div>

                {/* 3. AI Co-Pilot Master Switch */}
                <div className="p-4 bg-surface-page rounded-xl border border-border-default flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="font-bold text-text-primary text-xs cursor-pointer flex items-center gap-2">
                      <Bot className="w-4 h-4 text-accent-primary" />
                      Enable Super Admin Action AI Co-Pilot
                    </label>
                    <p className="text-[11px] text-text-muted">
                      Allows authorized Super Admins to interact via Ctrl+J floating assistant drawer.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aiForm.aiEnabled}
                      onChange={(e) => setAiForm({ ...aiForm, aiEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-primary"></div>
                  </label>
                </div>

                {/* 4. Action Buttons */}
                <div className="pt-3 border-t border-border-default flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => testAiConnectionMutation.mutate({
                      geminiApiKey: aiForm.geminiApiKey,
                      aiModelName: aiForm.aiModelName,
                    })}
                    disabled={testAiConnectionMutation.isPending}
                    className="px-4 py-2 bg-surface-raised hover:bg-surface-active text-text-primary rounded-xl font-semibold border border-border-default transition cursor-pointer flex items-center gap-1.5"
                  >
                    {testAiConnectionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-amber-500" />}
                    {testAiConnectionMutation.isPending ? 'Testing Connection...' : 'Test API Connection'}
                  </button>

                  <button
                    type="submit"
                    disabled={saveAiConfigMutation.isPending}
                    className="px-6 py-2.5 bg-accent-primary hover:bg-accent-hover text-white rounded-xl font-bold shadow-md shadow-sky-600/20 transition cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {saveAiConfigMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {saveAiConfigMutation.isPending ? 'Saving...' : 'Save AI Configuration'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: Store Branches */}
          {activeTab === 'branches' && (
            <div className="bg-surface-base rounded-2xl border border-border-default shadow-sm dark:shadow-xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border-default">
                <div>
                  <h3 className="font-bold text-sm text-text-primary">Multi-Branch Locations &amp; Outlets</h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Manage multiple physical pharmacy locations, warehouses, sub-branches, and separate cash registers.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddBranch}
                  className="px-4 py-2 bg-accent-primary hover:bg-accent-hover text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-sky-600/20 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add Store Branch
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {branches.map((b: any) => (
                  <div
                    key={b.id}
                    className="p-4 bg-surface-page border border-border-default rounded-2xl text-xs space-y-3 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-text-primary text-sm">{b.name}</h4>
                        <span className="font-mono bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded text-[10px] font-bold">
                          {b.code}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditBranch(b)}
                          title="Edit Branch"
                          className="p-1.5 text-text-muted hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!b.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleDeleteBranch(b)}
                            title="Delete / Deactivate Branch"
                            className="p-1.5 text-text-muted hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="text-text-muted space-y-0.5">
                      <div className="flex items-center gap-1.5 py-1 text-accent-primary font-semibold">
                        <Users className="w-3.5 h-3.5" />
                        <button
                          type="button"
                          onClick={() => {
                            setStaffBranchFilter(b.id);
                            setActiveTab('staff');
                          }}
                          className="hover:underline cursor-pointer"
                        >
                          Manage Staff &amp; Cashiers →
                        </button>
                      </div>
                      <p>{b.address || 'No address configured'}, {b.city || ''}</p>
                      <p>Phone: {b.phone || 'N/A'}</p>
                      {b.email && <p>Email: {b.email}</p>}
                    </div>

                    <div className="pt-2 border-t border-border-default flex items-center justify-between text-[10px]">
                      <span className={b.isActive ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400 font-medium'}>
                        {b.isActive ? '● Active' : '○ Inactive'}
                      </span>
                      {b.isDefault && (
                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-full font-bold">
                          Primary Default
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Branch Modal */}
              {branchModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-surface-base rounded-2xl shadow-2xl border border-border-default max-w-md w-full p-6 space-y-4 text-xs overflow-y-auto max-h-[90vh]">
                    <div className="flex items-center justify-between pb-3 border-b border-border-default">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-accent-primary" />
                        <h3 className="font-bold text-sm text-text-primary">
                          {editingBranch ? 'Edit Store Branch' : 'Add New Store Branch'}
                        </h3>
                      </div>
                      <button onClick={() => setBranchModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        saveBranchMutation.mutate(branchForm);
                      }}
                      className="space-y-3"
                    >
                      <div>
                        <label className="block font-semibold text-text-secondary mb-1">Branch Name *</label>
                        <input
                          required
                          type="text"
                          value={branchForm.name}
                          onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                          placeholder="e.g. Main Dispensary / South Branch"
                          className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-semibold text-text-secondary mb-1">Branch Code *</label>
                          <input
                            required
                            type="text"
                            value={branchForm.code}
                            disabled={Boolean(editingBranch)}
                            onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value.toUpperCase() })}
                            placeholder="e.g. BR-01"
                            className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary font-mono uppercase focus:outline-none focus:border-sky-500 disabled:opacity-60"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-text-secondary mb-1">Phone Number</label>
                          <input
                            type="tel"
                            value={branchForm.phone}
                            onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                            placeholder="+91 98765 43210"
                            className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary font-mono focus:outline-none focus:border-sky-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-text-secondary mb-1">Email</label>
                        <input
                          type="email"
                          value={branchForm.email}
                          onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })}
                          placeholder="branch@medcare.com"
                          className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-text-secondary mb-1">Address</label>
                        <input
                          type="text"
                          value={branchForm.address}
                          onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                          placeholder="Shop No. 4, Commercial Complex"
                          className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-semibold text-text-secondary mb-1">City</label>
                          <input
                            type="text"
                            value={branchForm.city}
                            onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
                            placeholder="Bangalore"
                            className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-text-secondary mb-1">State</label>
                          <input
                            type="text"
                            value={branchForm.state}
                            onChange={(e) => setBranchForm({ ...branchForm, state: e.target.value })}
                            placeholder="Karnataka"
                            className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-border-default">
                        <label className="flex items-center gap-2 cursor-pointer text-text-primary">
                          <input
                            type="checkbox"
                            checked={branchForm.isDefault}
                            onChange={(e) => setBranchForm({ ...branchForm, isDefault: e.target.checked })}
                            className="rounded text-sky-600"
                          />
                          <span>Primary Store</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer text-text-primary">
                          <input
                            type="checkbox"
                            checked={branchForm.isActive}
                            onChange={(e) => setBranchForm({ ...branchForm, isActive: e.target.checked })}
                            className="rounded text-sky-600"
                          />
                          <span>Active Outlet</span>
                        </label>
                      </div>

                      <div className="pt-3 flex justify-end gap-2 border-t border-border-default">
                        <button
                          type="button"
                          onClick={() => setBranchModalOpen(false)}
                          className="px-4 py-2 rounded-xl bg-surface-raised text-text-secondary hover:bg-surface-active"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={saveBranchMutation.isPending}
                          className="px-5 py-2 rounded-xl bg-accent-primary hover:bg-accent-hover font-bold text-white shadow-lg transition"
                        >
                          {saveBranchMutation.isPending ? 'Saving...' : editingBranch ? 'Update Branch' : 'Save Branch'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: Branch Staff & Roles */}
          {activeTab === 'staff' && (
            <div className="bg-surface-base rounded-2xl border border-border-default shadow-sm dark:shadow-xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border-default">
                <div>
                  <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                    <Users className="w-4 h-4 text-accent-primary" />
                    Branch Staff, Cashiers &amp; Role Management
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Add and manage multiple billing cashiers, licensed pharmacists, store managers, and stock executives per branch.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenAddStaff(staffBranchFilter)}
                  className="px-4 py-2 bg-accent-primary hover:bg-accent-hover text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-sky-600/20 transition cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  Add New Staff Person
                </button>
              </div>

              {/* Filters & Search */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-surface-page rounded-xl border border-border-default">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filter by Branch</label>
                  <select
                    value={staffBranchFilter}
                    onChange={(e) => setStaffBranchFilter(e.target.value)}
                    className="w-full px-3 py-1.5 bg-surface-base border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-text-primary"
                  >
                    <option value="">All Branches</option>
                    {branches.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filter by Role</label>
                  <select
                    value={staffRoleFilter}
                    onChange={(e) => setStaffRoleFilter(e.target.value)}
                    className="w-full px-3 py-1.5 bg-surface-base border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-text-primary"
                  >
                    <option value="">All Roles</option>
                    {allRoles.map((r: any) => (
                      <option key={r.id} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Search Staff</label>
                  <input
                    type="text"
                    value={staffSearch}
                    onChange={(e) => setStaffSearch(e.target.value)}
                    placeholder="Search by Name or Email..."
                    className="w-full px-3 py-1.5 bg-surface-base border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-text-primary"
                  />
                </div>
              </div>

              {/* Staff Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isUsersLoading ? (
                  <p className="col-span-3 py-10 text-center text-xs text-slate-400">Loading branch staff directory...</p>
                ) : (
                  staffUsers
                    .filter((u: any) => {
                      if (!staffRoleFilter) return true;
                      return u.roles?.some((r: any) => r.name === staffRoleFilter);
                    })
                    .map((user: any) => {
                      const userRoleName = user.roles?.[0]?.name || 'STAFF';
                      const userBranch = user.branches?.[0]?.name || 'Main Dispensary Branch';

                      let badgeColor = 'bg-surface-raised text-text-secondary border-slate-200 dark:border-slate-700';
                      if (userRoleName === 'OWNER' || userRoleName === 'ADMIN') {
                        badgeColor = 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800';
                      } else if (userRoleName === 'MANAGER') {
                        badgeColor = 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800';
                      } else if (userRoleName === 'PHARMACIST') {
                        badgeColor = 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
                      } else if (userRoleName === 'CASHIER') {
                        badgeColor = 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
                      } else if (userRoleName === 'INVENTORY_STAFF') {
                        badgeColor = 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800';
                      } else if (userRoleName === 'ACCOUNTANT') {
                        badgeColor = 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800';
                      }

                      return (
                        <div
                          key={user.id}
                          className="p-4 bg-surface-page border border-border-default rounded-2xl text-xs space-y-3 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-text-primary text-sm">
                                {user.firstName} {user.lastName}
                              </h4>
                              <span className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-[10px] border ${badgeColor} mt-1`}>
                                {userRoleName}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditStaff(user)}
                                title="Edit Staff Member"
                                className="p-1.5 text-text-muted hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {userRoleName !== 'OWNER' && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStaff(user)}
                                  title="Deactivate Staff"
                                  className="p-1.5 text-text-muted hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="text-text-muted space-y-1 font-mono text-[11px]">
                            <p>✉ {user.email}</p>
                            <p>📱 {user.mobile || 'No Phone'}</p>
                            <p className="font-sans text-[11px] text-slate-500">🏢 {userBranch}</p>
                          </div>

                          <div className="pt-2 border-t border-border-default flex items-center justify-between text-[10px]">
                            <span className={user.isActive ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}>
                              {user.isActive ? '● Active Login' : '○ Disabled'}
                            </span>
                            <span className="text-slate-400 font-mono text-[10px]">ID: {user.id.slice(0, 8)}...</span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>

              {/* Staff Add / Edit Modal */}
              {staffModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-surface-base rounded-2xl shadow-2xl border border-border-default max-w-lg w-full p-6 space-y-4 text-xs overflow-y-auto max-h-[90vh]">
                    <div className="flex items-center justify-between pb-3 border-b border-border-default">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-accent-primary" />
                        <h3 className="font-bold text-sm text-text-primary">
                          {editingStaff ? 'Edit Staff Member / Cashier' : 'Add New Staff Member / Cashier'}
                        </h3>
                      </div>
                      <button onClick={() => setStaffModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        saveStaffMutation.mutate(staffForm);
                      }}
                      className="space-y-3"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-text-secondary mb-1">First Name *</label>
                          <input
                            required
                            type="text"
                            value={staffForm.firstName}
                            onChange={(e) => setStaffForm({ ...staffForm, firstName: e.target.value })}
                            placeholder="e.g. Amit"
                            className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-text-secondary mb-1">Last Name</label>
                          <input
                            type="text"
                            value={staffForm.lastName}
                            onChange={(e) => setStaffForm({ ...staffForm, lastName: e.target.value })}
                            placeholder="e.g. Kumar (Cashier)"
                            className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-text-secondary mb-1">Email / User ID *</label>
                          <input
                            required
                            type="email"
                            value={staffForm.email}
                            onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                            placeholder="cashier2@medcare.com"
                            className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-text-secondary mb-1">Mobile Number</label>
                          <input
                            type="tel"
                            value={staffForm.mobile}
                            onChange={(e) => setStaffForm({ ...staffForm, mobile: e.target.value })}
                            placeholder="9876543210"
                            className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500 font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-text-secondary mb-1">
                          {editingStaff ? 'New Password (Leave blank to keep unchanged)' : 'Login Password *'}
                        </label>
                        <input
                          type="password"
                          required={!editingStaff}
                          value={staffForm.password}
                          onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                          placeholder={editingStaff ? '••••••••' : 'Min. 6 characters (e.g. Cashier@123456)'}
                          className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500 font-mono"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-text-secondary mb-1">Assigned Role *</label>
                          <select
                            required
                            value={staffForm.roleId}
                            onChange={(e) => setStaffForm({ ...staffForm, roleId: e.target.value })}
                            className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500 font-bold"
                          >
                            <option value="">Select Role...</option>
                            {allRoles.map((r: any) => (
                              <option key={r.id} value={r.id}>
                                {r.name} - {r.description?.slice(0, 30)}...
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-text-secondary mb-1">Assigned Store Branch *</label>
                          <select
                            required
                            value={staffForm.branchId}
                            onChange={(e) => setStaffForm({ ...staffForm, branchId: e.target.value })}
                            className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                          >
                            <option value="">Select Branch...</option>
                            {branches.map((b: any) => (
                              <option key={b.id} value={b.id}>
                                {b.name} ({b.code})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-border-default">
                        <label className="flex items-center gap-2 cursor-pointer text-text-primary font-semibold">
                          <input
                            type="checkbox"
                            checked={staffForm.isActive}
                            onChange={(e) => setStaffForm({ ...staffForm, isActive: e.target.checked })}
                            className="rounded text-sky-600"
                          />
                          <span>Active Login Access Enabled</span>
                        </label>
                      </div>

                      <div className="pt-3 flex justify-end gap-2 border-t border-border-default">
                        <button
                          type="button"
                          onClick={() => setStaffModalOpen(false)}
                          className="px-4 py-2 rounded-xl bg-surface-raised text-text-secondary hover:bg-surface-active"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={saveStaffMutation.isPending}
                          className="px-5 py-2 rounded-xl bg-accent-primary hover:bg-accent-hover font-bold text-white shadow-lg transition"
                        >
                          {saveStaffMutation.isPending ? 'Saving...' : editingStaff ? 'Update Staff Member' : 'Create Staff Member'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Database Backup & Google Drive */}
          {activeTab === 'backup' && (
            <div className="space-y-6 max-w-4xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-surface-base p-5 rounded-2xl border border-border-default shadow-sm dark:shadow-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted font-medium">Server Storage</span>
                    <Server className="w-5 h-5 text-accent-primary" />
                  </div>
                  <h4 className="text-xl font-bold text-text-primary font-mono">{backups.length} Snapshots</h4>
                  <p className="text-[11px] text-text-muted">Point-in-time database records ready on server.</p>
                </div>

                <div className="bg-surface-base p-5 rounded-2xl border border-border-default shadow-sm dark:shadow-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted font-medium">Google Drive Cloud</span>
                    <Cloud className={`w-5 h-5 ${gdrive.connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                  </div>
                  <h4 className="text-xl font-bold text-text-primary flex items-center gap-1.5 font-mono">
                    {gdrive.connected ? 'Connected' : 'Not Linked'}
                  </h4>
                  <p className="text-[11px] text-text-muted">
                    {gdrive.connected ? `Folder: ${gdrive.folderName}` : 'Connect Google Drive for offsite cloud sync.'}
                  </p>
                </div>

                <div className="bg-surface-base p-5 rounded-2xl border border-border-default shadow-sm dark:shadow-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted font-medium">Database Volume</span>
                    <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h4 className="text-xl font-bold text-text-primary font-mono">
                    {backupStats.sales || 0} Bills • {backupStats.medicines || 0} Items
                  </h4>
                  <p className="text-[11px] text-text-muted">15 tables secured across all branches.</p>
                </div>
              </div>

              <div className="bg-surface-base p-6 rounded-2xl border border-border-default shadow-sm dark:shadow-xl space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border-default">
                  <div>
                    <h3 className="font-bold text-sm text-text-primary">Create Immediate Database Snapshot &amp; Retention Policy</h3>
                    <p className="text-xs text-text-muted mt-0.5">
                      Generates a verified snapshot including medicines, batches, sales, ledger entries, and tax receipts.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => setGdriveModal(true)}
                      className="px-3.5 py-2 bg-surface-raised hover:bg-surface-active text-text-primary rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                    >
                      <Cloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Google Drive Setup
                    </button>

                    <button
                      onClick={() => createBackupMutation.mutate()}
                      disabled={createBackupMutation.isPending}
                      className="px-4 py-2 bg-accent-primary hover:bg-accent-hover text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-sky-600/20 transition cursor-pointer disabled:opacity-50"
                    >
                      <Database className="w-4 h-4" />
                      {createBackupMutation.isPending ? 'Generating Backup...' : 'Create Backup Snapshot'}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-text-secondary">
                      Backup Retention Period:
                    </label>
                    <select
                      value={retentionDays}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setRetentionDays(val);
                        saveGdriveConfigMutation.mutate({ retentionDays: val });
                      }}
                      className="px-3 py-1.5 bg-surface-page border border-border-strong rounded-xl text-xs font-semibold text-text-primary focus:outline-none focus:border-sky-500"
                    >
                      <option value={1}>1 Day (Auto-delete older backups on next upload)</option>
                      <option value={2}>2 Days</option>
                      <option value={3}>3 Days</option>
                      <option value={4}>4 Days</option>
                      <option value={5}>5 Days</option>
                      <option value={6}>6 Days</option>
                      <option value={7}>7 Days (Maximum 1 Week)</option>
                    </select>
                  </div>
                  <span className="text-[11px] text-text-muted">
                    • Expired snapshots older than {retentionDays} {retentionDays === 1 ? 'day' : 'days'} are automatically purged to prevent server disk overflow.
                  </span>
                </div>

                <div className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
                  gdrive.connected
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                    : 'bg-slate-50 dark:bg-slate-900/60 border-border-default text-text-secondary'
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

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-xs text-text-primary">
                      Saved Backup Snapshots ({backups.length})
                    </label>
                    <button
                      onClick={() => queryClient.invalidateQueries({ queryKey: ['backup-history'] })}
                      className="text-[11px] text-accent-primary hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Refresh
                    </button>
                  </div>

                  {isBackupsLoading ? (
                    <p className="text-xs text-slate-400 py-6 text-center">Loading backup archives...</p>
                  ) : backups.length === 0 ? (
                    <div className="p-8 text-center bg-surface-page rounded-xl border border-border-default space-y-2">
                      <Database className="w-8 h-8 text-slate-400 mx-auto stroke-1" />
                      <p className="text-xs font-semibold text-text-secondary">No backup snapshots generated yet.</p>
                      <p className="text-[11px] text-text-muted">Click "Create Backup Snapshot" to create your first full database backup.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-border-default">
                      <table className="w-full text-left text-xs min-w-[650px]">
                        <thead className="bg-surface-raised text-text-muted font-semibold border-b border-border-default text-[10px] uppercase">
                          <tr>
                            <th className="py-2.5 px-3">Snapshot Name</th>
                            <th className="py-2.5 px-3">Size</th>
                            <th className="py-2.5 px-3">Timestamp</th>
                            <th className="py-2.5 px-3 text-center">Drive Cloud</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-default bg-surface-base">
                          {backups.map((b: any) => (
                            <tr key={b.id} className="hover:bg-surface-raised">
                              <td className="py-2.5 px-3">
                                <div className="font-mono font-bold text-text-primary flex items-center gap-1.5">
                                  <Database className="w-3.5 h-3.5 text-accent-primary" />
                                  <span>{b.filename}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">ID: {b.id}</span>
                              </td>
                              <td className="py-2.5 px-3 font-mono font-semibold text-text-secondary">
                                {(b.sizeBytes / 1024).toFixed(1)} KB
                              </td>
                              <td className="py-2.5 px-3 text-text-muted font-mono text-[11px]">
                                {new Date(b.createdAt).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {b.gdriveStatus === 'SYNCED' ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
                                    <Cloud className="w-3 h-3" /> Synced
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-surface-raised text-text-muted border border-slate-200 dark:border-slate-700">
                                    Local Only
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleDownloadBackup(b.id)}
                                    title="Download JSON Snapshot to PC"
                                    className="p-1.5 bg-sky-50 dark:bg-slate-800 text-accent-primary hover:bg-sky-100 dark:hover:bg-slate-700 rounded-lg transition"
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
                  <div className="bg-surface-base rounded-2xl shadow-2xl border border-border-default max-w-md w-full p-6 space-y-4 text-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-border-default">
                      <div className="flex items-center gap-2">
                        <Cloud className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        <h3 className="font-bold text-sm text-text-primary">Google Drive Integration</h3>
                      </div>
                      <button onClick={() => setGdriveModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        ✕
                      </button>
                    </div>

                    <p className="text-text-muted">
                      Configure your Google Drive folder where automated database snapshots will be securely mirrored.
                    </p>

                    <div className="space-y-3">
                      <div>
                        <label className="font-semibold text-text-secondary block mb-1">
                          Google Drive Folder Name / ID
                        </label>
                        <input
                          type="text"
                          value={gdriveFolderInput}
                          onChange={(e) => setGdriveFolderInput(e.target.value)}
                          placeholder="e.g. MedCare_Pharmacy_Backups"
                          className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-sky-500 font-mono text-xs"
                        />
                      </div>

                      <div className="p-3 bg-surface-page rounded-xl border border-border-default space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer font-semibold text-text-primary">
                          <input
                            type="checkbox"
                            checked={gdriveAutoSync}
                            onChange={(e) => setGdriveAutoSync(e.target.checked)}
                            className="rounded text-sky-600"
                          />
                          <span>Auto-Sync to Google Drive on every backup</span>
                        </label>
                        <p className="text-[10px] text-text-muted pl-6">
                          Whenever a new backup is created, it will automatically sync to your cloud folder.
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border-default flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setGdriveModal(false)}
                        className="px-3 py-2 text-text-muted hover:bg-surface-raised rounded-xl"
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
