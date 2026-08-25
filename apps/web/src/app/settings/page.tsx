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
  MessageSquare,
  QrCode,
  Smartphone,
  Send,
  PowerOff,
  Bot,
  Eye,
  EyeOff,
  Sliders,
  Zap,
  Layers,
} from 'lucide-react';
import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { PageHeader } from '../../components/ui/page-header';
import { apiClient } from '../../lib/api-client';
import { useBrandingStore } from '../../stores/branding-store';
import { PrintStudioCustomizer } from '../../components/print-studio-customizer';
import { PaperWidth } from '@medical-inventory/shared-types';
import { useAuthStore } from '../../stores/auth-store';

const INDIAN_STATES = [
  'Jharkhand', 'Bihar', 'West Bengal', 'Uttar Pradesh', 'Maharashtra',
  'Delhi', 'Gujarat', 'Rajasthan', 'Madhya Pradesh', 'Karnataka',
  'Tamil Nadu', 'Telangana', 'Andhra Pradesh', 'Kerala', 'Punjab',
  'Haryana', 'Odisha', 'Assam', 'Chhattisgarh', 'Uttarakhand',
  'Himachal Pradesh', 'Goa', 'Tripura', 'Manipur', 'Meghalaya',
  'Nagaland', 'Mizoram', 'Sikkim', 'Arunachal Pradesh', 'Chandigarh',
  'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Andaman and Nicobar Islands',
  'Dadra and Nagar Haveli and Daman and Diu', 'Lakshadweep'
];

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [deleteModalBranch, setDeleteModalBranch] = useState<any | null>(null);
  const [adminEmail, setAdminEmail] = useState(user?.email || 'chiku542254@gmail.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [confirmBranchCode, setConfirmBranchCode] = useState('');

  const secureDeleteMutation = useMutation({
    mutationFn: async ({ branchId, email, password }: { branchId: string; email: string; password?: string }) => {
      const res = await apiClient.post(`/branches/${branchId}/secure-delete`, { email, password });
      return res.data;
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['settings-branches'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-branches-list'] });
      queryClient.invalidateQueries({ queryKey: ['active-branches-list'] });
      queryClient.invalidateQueries({ queryKey: ['branches'] });

      setDeleteModalBranch(null);
      setAdminPassword('');
      setConfirmBranchCode('');
      alert(res?.message || 'Store branch deleted permanently after Super Admin re-authentication.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete branch. Please verify Super Admin password.');
    },
  });

  const { selectedBranchId } = useAuthStore();
  const queryClient = useQueryClient();
  const { fetchBranding, updateLogoImmediately, logo: currentStoreLogo } = useBrandingStore();
  const [activeTab, setActiveTab] = useState<'business' | 'branches' | 'receipt' | 'staff' | 'ai' | 'whatsapp'>('business');
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

  
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any | null>(null);
  const [branchForm, setBranchForm] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    state: 'Jharkhand',
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
  const [staffBranchFilter, setStaffBranchFilter] = useState(selectedBranchId || '');

  React.useEffect(() => {
    if (selectedBranchId) {
      setStaffBranchFilter(selectedBranchId);
    }
  }, [selectedBranchId]);
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

  const rawSettingsBranches = Array.isArray(branchesData) ? branchesData : (branchesData?.data || []);
  const branches: any[] = rawSettingsBranches.length > 0
    ? rawSettingsBranches
    : (Array.isArray(user?.branches) ? user.branches : []).map((b: any) => ({
        id: b.id || b.branchId,
        name: b.name || b.branch?.name || 'Branch',
        code: b.code || b.branch?.code || 'BR',
        address: b.address || b.branch?.address || 'Main Road',
        city: b.city || b.branch?.city || 'Main City',
        state: b.state || b.branch?.state || 'State',
        phone: b.phone || b.branch?.phone || '+91 9999999999',
        email: b.email || b.branch?.email,
        isActive: b.isActive !== undefined ? b.isActive : true,
        isDefault: b.isDefault !== undefined ? b.isDefault : false,
      }));

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
      const branchPayload = {
        ...payload,
        state: payload.state || 'Jharkhand',
        address: payload.address || payload.city || 'Main Market Road',
        city: payload.city || 'Giridih',
        phone: payload.phone || '+91 9999999999',
      };
      if (editingBranch) {
        return apiClient.patch(`/branches/${editingBranch.id}`, branchPayload);
      }
      return apiClient.post('/branches', branchPayload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-branches'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-branches-list'] });
      queryClient.invalidateQueries({ queryKey: ['active-branches-list'] });
      queryClient.invalidateQueries({ queryKey: ['branches'] });
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
      queryClient.invalidateQueries({ queryKey: ['super-admin-branches-list'] });
      queryClient.invalidateQueries({ queryKey: ['active-branches-list'] });
      queryClient.invalidateQueries({ queryKey: ['branches'] });
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
    setDeleteModalBranch(b);
    setAdminEmail(user?.email || 'chiku542254@gmail.com');
    setAdminPassword('');
    setConfirmBranchCode('');
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
                Configure pharmacy licenses, store branding, themes, thermal printer formats, staff roles, and AI Co-Pilot API keys.
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
              { id: 'business', label: 'Business Profile & Branding', icon: Building2 },
              { id: 'branches', label: 'Store Branches', icon: Layers },
              { id: 'receipt', label: 'Thermal & Universal Print Setup', icon: Printer },
              { id: 'staff', label: 'Staff & User Roles', icon: Users },
              { id: 'ai', label: 'AI Co-Pilot & Chatbot API', icon: Sparkles },
              { id: 'whatsapp', label: 'WhatsApp Integration & QR', icon: MessageSquare },
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
                onSubmit={async (e: any) => {
                  e.preventDefault();
                  const fd = new FormData(e.target);
                  const businessPayload = {
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
                  };

                  const brandingPayload = {
                    appName: fd.get('name'),
                    tagline: fd.get('description'),
                    logoUrl: fd.get('logoUrl') || undefined,
                    primaryColor: fd.get('primaryColor') || '#0284c7',
                    supportEmail: fd.get('supportEmail') || fd.get('email'),
                    supportPhone: fd.get('supportPhone') || fd.get('phone'),
                  };

                  saveBusinessMutation.mutate(businessPayload);
                  saveBrandingMutation.mutate(brandingPayload);
                }}
                className="space-y-6 text-xs"
              >
                {/* ── 1. Store Logo & Brand Icon ───────────────────── */}
                <div className="p-4 bg-surface-page rounded-2xl border border-border-default flex flex-wrap items-center gap-5">
                  <div className="w-20 h-20 rounded-2xl bg-surface-base border-2 border-dashed border-border-strong flex items-center justify-center overflow-hidden flex-shrink-0 relative group shadow-inner">
                    {currentStoreLogo ? (
                      <img src={currentStoreLogo} alt="Medical Store Logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      <Building2 className="w-8 h-8 text-accent-primary opacity-60" />
                    )}
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text-primary text-sm">Official Medical Store Logo</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950/60 text-accent-primary border border-sky-200 dark:border-sky-800">
                        Top Nav + Invoices
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted">
                      Upload your pharmacy store emblem (PNG, JPG, SVG, WebP). This logo will instantly replace the top earth icon and appear on all thermal &amp; A4 bills.
                    </p>
                    <div className="flex items-center gap-3 pt-1">
                      <label className="px-4 py-2 bg-accent-primary hover:bg-accent-hover text-white rounded-xl font-bold cursor-pointer transition flex items-center gap-1.5 text-xs shadow-md shadow-sky-600/20 active:scale-95">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadLogoMutation.isPending ? 'Uploading...' : 'Upload New Logo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = () => {
                                const base64 = reader.result as string;
                                uploadLogoMutation.mutate(base64);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {currentStoreLogo && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Remove custom logo and reset to default emblem?')) {
                              uploadLogoMutation.mutate('');
                            }
                          }}
                          className="px-3 py-2 text-status-error hover:bg-status-error-bg rounded-xl font-semibold transition border border-status-error-border text-xs"
                        >
                          Remove Logo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-text-secondary">Pharmacy / Medical Business Name *</label>
                    <input
                      name="name"
                      defaultValue={businessData.name}
                      required
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-sky-500 font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-text-secondary">Store Tagline / Slogan</label>
                    <input
                      name="description"
                      defaultValue={businessData.description || ''}
                      placeholder="e.g. 24x7 Chemist & Druggist"
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-text-secondary">GSTIN / Tax Identification No.</label>
                    <input
                      name="gstNumber"
                      defaultValue={businessData.gstNumber || ''}
                      placeholder="e.g. 20AAAAA0000A1Z5"
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-text-secondary">Drug License No. (DL 20B / 21B)</label>
                    <input
                      name="pharmacyLicense"
                      defaultValue={businessData.pharmacyLicense || ''}
                      placeholder="e.g. DL-JH-GIR-12345"
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-text-secondary">Primary Contact Phone *</label>
                    <input
                      name="phone"
                      defaultValue={businessData.phone || ''}
                      required
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-text-secondary">Alternate / WhatsApp Phone</label>
                    <input
                      name="altPhone"
                      defaultValue={businessData.altPhone || ''}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-text-secondary">Official Email Address</label>
                    <input
                      name="email"
                      type="email"
                      defaultValue={businessData.email || ''}
                      placeholder="info@pharmacy.com"
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-text-secondary">Website URL</label>
                    <input
                      name="website"
                      defaultValue={businessData.website || ''}
                      placeholder="https://mypharmacy.com"
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="font-semibold text-text-secondary">Pharmacy Shop Street Address *</label>
                    <textarea
                      name="address"
                      defaultValue={businessData.address || ''}
                      rows={2}
                      required
                      placeholder="Shop No. 4, Ground Floor, Medical Market, Main Road"
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-text-secondary">City / District *</label>
                    <input
                      name="city"
                      defaultValue={businessData.city || ''}
                      required
                      placeholder="e.g. Giridih"
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-text-secondary">State (Indian State) *</label>
                    <select
                      name="state"
                      defaultValue={businessData.state || 'Jharkhand'}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-sky-500 font-semibold"
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-text-secondary">Postal PIN Code *</label>
                    <input
                      name="pinZip"
                      defaultValue={businessData.pinZip || ''}
                      required
                      placeholder="e.g. 815301"
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-text-secondary">Country</label>
                    <input
                      name="country"
                      defaultValue={businessData.country || 'India'}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-text-secondary">Currency Symbol</label>
                    <input
                      name="currencySymbol"
                      defaultValue={businessData.currencySymbol || '₹'}
                      placeholder="₹"
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl font-bold font-mono text-text-primary focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  {/* ── Brand Color & Theme Settings ── */}
                  <div className="space-y-1">
                    <label className="font-semibold text-text-secondary flex items-center justify-between">
                      <span>Brand Accent Color</span>
                      <span className="text-[10px] text-text-muted font-mono">{brandingData?.primaryColor || '#0284c7'}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        name="primaryColorPicker"
                        defaultValue={brandingData?.primaryColor || '#0284c7'}
                        onChange={(e) => {
                          const input = document.getElementById('primaryColorInput') as HTMLInputElement;
                          if (input) input.value = e.target.value;
                        }}
                        className="w-9 h-9 p-0.5 rounded-xl border border-border-default bg-surface-page cursor-pointer"
                      />
                      <input
                        id="primaryColorInput"
                        name="primaryColor"
                        defaultValue={brandingData?.primaryColor || '#0284c7'}
                        placeholder="#0284c7"
                        className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl font-mono text-text-primary focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-text-secondary">Customer Support Email</label>
                    <input
                      name="supportEmail"
                      type="email"
                      defaultValue={brandingData?.supportEmail || businessData.email || ''}
                      placeholder="support@pharmacy.com"
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-text-secondary">Customer Support Phone / Helpline</label>
                    <input
                      name="supportPhone"
                      defaultValue={brandingData?.supportPhone || businessData.phone || ''}
                      placeholder="e.g. 1800-XXX-XXXX or +91 98765 43210"
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="font-semibold text-text-secondary">External Logo Image URL (Optional Fallback)</label>
                    <input
                      name="logoUrl"
                      defaultValue={brandingData?.logoUrl || ''}
                      placeholder="https://example.com/pharmacy-logo.png"
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border-default flex justify-end">
                  <button
                    type="submit"
                    disabled={saveBusinessMutation.isPending}
                    className="px-6 py-2.5 bg-accent-primary hover:bg-accent-hover text-white rounded-xl font-bold shadow-md shadow-sky-600/20 transition cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {saveBusinessMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {saveBusinessMutation.isPending || saveBrandingMutation.isPending ? 'Saving...' : 'Save Business Profile & Brand Info'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 1.5: Store Branches Management */}
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
                      <p>State: {b.state || 'Jharkhand'}</p>
                      <p>Phone: {b.phone || 'N/A'}</p>
                      {b.email && <p>Email: {b.email}</p>}
                    </div>

                    {b.isDefault && (
                      <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px]">
                        Primary Default Store
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Branch Modal */}
              {branchModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-surface-base rounded-2xl shadow-2xl border border-border-default max-w-md w-full p-6 space-y-4 text-xs">
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
                          placeholder="e.g. City Dispensary Unit"
                          className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500 font-bold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-semibold text-text-secondary mb-1">Branch Code *</label>
                          <input
                            required
                            type="text"
                            value={branchForm.code}
                            onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value.toUpperCase() })}
                            placeholder="BR-02"
                            className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500 font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-text-secondary mb-1">City *</label>
                          <input
                            required
                            type="text"
                            value={branchForm.city}
                            onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
                            placeholder="e.g. Giridih"
                            className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-text-secondary mb-1">State (Indian State) *</label>
                        <select
                          value={branchForm.state || 'Jharkhand'}
                          onChange={(e) => setBranchForm({ ...branchForm, state: e.target.value })}
                          className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500 font-semibold"
                        >
                          {INDIAN_STATES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-text-secondary mb-1">Street Address</label>
                        <input
                          type="text"
                          value={branchForm.address}
                          onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                          placeholder="Market Road, Opp. Hospital"
                          className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-semibold text-text-secondary mb-1">Phone</label>
                          <input
                            type="text"
                            value={branchForm.phone}
                            onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                            placeholder="+91 98765 43210"
                            className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-text-secondary mb-1">Email</label>
                          <input
                            type="email"
                            value={branchForm.email}
                            onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })}
                            placeholder="branch@pharmacy.com"
                            className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-border-default">
                        <label className="flex items-center gap-2 cursor-pointer text-text-primary font-semibold">
                          <input
                            type="checkbox"
                            checked={branchForm.isDefault}
                            onChange={(e) => setBranchForm({ ...branchForm, isDefault: e.target.checked })}
                            className="rounded text-sky-600"
                          />
                          <span>Set as Primary Store Branch</span>
                        </label>
                      </div>

                      <div className="pt-3 flex justify-end gap-2 border-t border-border-default">
                        <button
                          type="button"
                          onClick={() => setBranchModalOpen(false)}
                          className="px-4 py-2 rounded-xl bg-surface-raised text-text-secondary hover:bg-surface-active cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={saveBranchMutation.isPending}
                          className="px-5 py-2 rounded-xl bg-accent-primary hover:bg-accent-hover font-bold text-white shadow-lg transition cursor-pointer"
                        >
                          {saveBranchMutation.isPending ? 'Saving...' : editingBranch ? 'Update Branch' : 'Create Branch'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
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

          {/* TAB: Pharmacy Staff & Roles */}
          {activeTab === 'staff' && (
            <div className="bg-surface-base rounded-2xl border border-border-default shadow-sm dark:shadow-xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border-default">
                <div>
                  <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                    <Users className="w-4 h-4 text-accent-primary" />
                    Pharmacy Staff, Cashiers &amp; Role Management
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Add and manage billing cashiers, licensed pharmacists, store managers, and account executives for your medical store.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenAddStaff(branches[0]?.id || '')}
                  className="px-4 py-2 bg-accent-primary hover:bg-accent-hover text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-sky-600/20 transition cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  Add New Staff Person
                </button>
              </div>

              {/* Filters & Search */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-surface-page rounded-xl border border-border-default">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filter by Store Branch</label>
                  <select
                    value={staffBranchFilter}
                    onChange={(e) => setStaffBranchFilter(e.target.value)}
                    className="w-full px-3 py-1.5 bg-surface-base border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-text-primary"
                  >
                    <option value="">All Branches (Show All)</option>
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
                    <option value="">All Roles (Show All Staff)</option>
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
                      if (staffBranchFilter && !u.branches?.some((b: any) => b.id === staffBranchFilter)) return false;
                      if (staffRoleFilter && !u.roles?.some((r: any) => r.name === staffRoleFilter)) return false;
                      if (staffSearch) {
                        const q = staffSearch.toLowerCase();
                        const matchName = `${u.firstName} ${u.lastName}`.toLowerCase().includes(q);
                        const matchEmail = u.email?.toLowerCase().includes(q);
                        return matchName || matchEmail;
                      }
                      return true;
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
                          </div>
                        </div>
                      );
                    })
                )}
              </div>

              {/* Staff Modal */}
              {staffModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-surface-base rounded-2xl shadow-2xl border border-border-default max-w-md w-full p-6 space-y-4 text-xs overflow-y-auto max-h-[90vh]">
                    <div className="flex items-center justify-between pb-3 border-b border-border-default">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-accent-primary" />
                        <h3 className="font-bold text-sm text-text-primary">
                          {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
                        </h3>
                      </div>
                      <button onClick={() => setStaffModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const payload = {
                          ...staffForm,
                          branchId: staffForm.branchId || branches[0]?.id || '',
                        };
                        saveStaffMutation.mutate(payload);
                      }}
                      className="space-y-3"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-semibold text-text-secondary mb-1">First Name *</label>
                          <input
                            required
                            type="text"
                            value={staffForm.firstName}
                            onChange={(e) => setStaffForm({ ...staffForm, firstName: e.target.value })}
                            placeholder="e.g. Ramesh"
                            className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-text-secondary mb-1">Last Name</label>
                          <input
                            type="text"
                            value={staffForm.lastName}
                            onChange={(e) => setStaffForm({ ...staffForm, lastName: e.target.value })}
                            placeholder="e.g. Kumar"
                            className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-semibold text-text-secondary mb-1">Email Address *</label>
                          <input
                            required
                            type="email"
                            value={staffForm.email}
                            onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                            placeholder="ramesh@pharmacy.com"
                            className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-text-secondary mb-1">Mobile Number</label>
                          <input
                            type="tel"
                            value={staffForm.mobile}
                            onChange={(e) => setStaffForm({ ...staffForm, mobile: e.target.value })}
                            placeholder="+91 98765 43210"
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
                              {r.name} - {r.description?.slice(0, 35)}...
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
                          className="w-full px-3 py-2 bg-surface-page border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-sky-500 font-medium"
                        >
                          <option value="">Select Branch...</option>
                          {branches.map((b: any) => (
                            <option key={b.id} value={b.id}>
                              {b.name} ({b.code})
                            </option>
                          ))}
                        </select>
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

          
          {/* TAB 7: WhatsApp Integration & QR Setup */}
          {activeTab === 'whatsapp' && (
            <div className="bg-surface-base rounded-2xl border border-border-default shadow-sm dark:shadow-xl p-6 max-w-4xl space-y-6">
              <div>
                <h3 className="font-bold text-base text-text-primary flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  WhatsApp Web QR Integration for Current Branch
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Link your medical store mobile WhatsApp account to automatically send invoices, receipts, and outstanding balance reminders directly to customers.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-text-primary">Multi-Branch Isolated WhatsApp Gateway</h4>
                    <p className="text-xs text-text-secondary">
                      Each branch maintains its own dedicated WhatsApp connection. You can manage live connection, scan QR, and view audit history in the WhatsApp Hub.
                    </p>
                  </div>

                  <a
                    href="/whatsapp"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition flex-shrink-0"
                  >
                    <QrCode className="w-4 h-4" />
                    Open WhatsApp QR Hub
                  </a>
                </div>
              </div>
            </div>
          )}
  
        
        {/* Super Admin Re-Authentication Branch Delete Modal */}
        {deleteModalBranch && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface-base border border-red-500/30 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-scale-in text-xs text-text-primary">
              <div className="flex justify-between items-center pb-3 border-b border-border-default">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-sm">
                  <AlertCircle className="w-5 h-5" />
                  <span>Super Admin Verification Required</span>
                </div>
                <button
                  onClick={() => setDeleteModalBranch(null)}
                  className="text-text-muted hover:text-text-primary font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl space-y-1 text-red-700 dark:text-red-300">
                <p className="font-bold">⚠️ Permanent Deletion:</p>
                <p className="text-[11px]">
                  You are deleting branch <strong>{deleteModalBranch.name} ({deleteModalBranch.code})</strong>. To prevent unauthorized deletions, re-enter your Super Admin credentials.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!adminEmail.trim() || !adminPassword.trim()) {
                    alert('Please enter your Super Admin email and password.');
                    return;
                  }
                  if (confirmBranchCode.trim().toUpperCase() !== deleteModalBranch.code.trim().toUpperCase()) {
                    alert(`Confirmation failed. Please type "${deleteModalBranch.code}" to confirm.`);
                    return;
                  }
                  secureDeleteMutation.mutate({
                    branchId: deleteModalBranch.id,
                    email: adminEmail.trim(),
                    password: adminPassword.trim(),
                  });
                }}
                className="space-y-3 pt-1"
              >
                <div>
                  <label className="block text-text-secondary font-semibold mb-1">
                    Super Admin User ID / Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="Super Admin login email"
                    className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-text-secondary font-semibold mb-1">
                    Super Admin Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showAdminPassword ? 'text' : 'password'}
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Enter your Super Admin password"
                      className="w-full pl-3 pr-9 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-red-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-2.5 top-2.5 text-text-muted hover:text-text-primary"
                    >
                      {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-text-secondary font-semibold mb-1">
                    Type Branch Code <strong className="text-red-500 font-mono">"{deleteModalBranch.code}"</strong> to Confirm *
                  </label>
                  <input
                    type="text"
                    required
                    value={confirmBranchCode}
                    onChange={(e) => setConfirmBranchCode(e.target.value.toUpperCase())}
                    placeholder={deleteModalBranch.code}
                    className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-red-500 font-mono uppercase font-bold"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border-default">
                  <button
                    type="button"
                    onClick={() => setDeleteModalBranch(null)}
                    className="px-4 py-2 bg-surface-raised hover:bg-surface-page text-text-secondary rounded-xl font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={secureDeleteMutation.isPending}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {secureDeleteMutation.isPending ? 'Verifying & Deleting...' : 'Re-Authenticate & Delete'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        </main>
      </div>
    </div>
  );
}
