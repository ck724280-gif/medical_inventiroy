'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Plus,
  ArrowLeft,
  Edit2,
  Trash2,
  Lock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MapPin,
  Phone,
  Mail,
  Shield,
  Layers,
  Search,
  Copy,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  LogIn,
  KeyRound,
  User,
  Share2,
  CheckCheck,
} from 'lucide-react';
import Link from 'next/link';

import { Sidebar } from '../../../components/sidebar';
import { Header } from '../../../components/header';
import { PageHeader } from '../../../components/ui/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Skeleton } from '../../../components/ui/skeleton';
import { apiClient } from '../../../lib/api-client';
import { useAuthStore } from '../../../stores/auth-store';
import { extractDataArray } from '../../../lib/utils';

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

export default function SuperAdminBranchesPage() {
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
    onSuccess: (res: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-branches-list'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-overview'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-branches-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['active-branches-list'] });
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      queryClient.invalidateQueries({ queryKey: ['settings-branches'] });

      if (selectedBranchId === variables.branchId) {
        // Reset to default branch
        const remaining = allBranches.find((b: any) => b.id !== variables.branchId);
        if (remaining) {
          setSelectedBranchId(remaining.id);
        }
      }

      setDeleteModalBranch(null);
      setAdminPassword('');
      setConfirmBranchCode('');
      alert(res?.message || 'Store branch deleted permanently after Super Admin re-authentication.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete branch. Please verify Super Admin password.');
    },
  });

  const queryClient = useQueryClient();
  const { selectedBranchId, setSelectedBranchId } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  const [newBranch, setNewBranch] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    state: 'Jharkhand',
    phone: '',
    email: '',
  });

  const webLoginUrl = typeof window !== 'undefined' ? `${window.location.origin}/login` : 'https://web-three-rho-95.vercel.app/login';

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const togglePasswordVisibility = (branchId: string) => {
    setShowPasswordMap((prev) => ({
      ...prev,
      [branchId]: !prev[branchId],
    }));
  };

  // 1. Fetch Branches
  const { data: branchesData, isLoading: isBranchesLoading } = useQuery({
    queryKey: ['super-admin-branches-list'],
    queryFn: async () => {
      const res = await apiClient.get('/branches');
      return res.data;
    },
  });

  // 2. Fetch Users to match branch managers/staff
  const { data: usersData } = useQuery({
    queryKey: ['super-admin-users-all'],
    queryFn: async () => {
      const res = await apiClient.get('/users', { params: { limit: 100 } });
      return res.data;
    },
  });

  const createBranchMutation = useMutation({
    mutationFn: async (payload: typeof newBranch) => {
      const branchPayload = {
        ...payload,
        state: payload.state || 'Jharkhand',
        address: payload.address || payload.city || 'Main Market Road',
        city: payload.city || 'Giridih',
        phone: payload.phone || '+91 9999999999',
      };
      const res = await apiClient.post('/branches', branchPayload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-branches-list'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-overview'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-branches-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['active-branches-list'] });
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setIsCreateModalOpen(false);
      setNewBranch({ name: '', code: '', address: '', city: '', state: 'Jharkhand', phone: '', email: '' });
      alert('Branch created successfully!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to create branch');
    },
  });

  const rawBranches = extractDataArray(branchesData);
  const userBranchesList = Array.isArray(user?.branches) ? user.branches : [];
  const allBranches: any[] = rawBranches.length > 0
    ? rawBranches
    : userBranchesList.map((b: any) => ({
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
  const allUsers = extractDataArray(usersData);

  const filtered = allBranches.filter(
    (b) =>
      b.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.city && b.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex h-screen bg-surface-page text-text-primary overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <PageHeader
            title="Branch Management & Multi-Store Network"
            description="Manage branches, view direct web access URLs, branch admin credentials, and seamlessly switch store contexts."
            badge={<Badge variant="outline">{allBranches.length} / 50 Branches Active</Badge>}
            actions={
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(true)}
                  disabled={allBranches.length >= 50}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add New Branch
                </Button>
                <Link href="/super-admin">
                  <Button variant="secondary" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    Back to Control Center
                  </Button>
                </Link>
              </div>
            }
          />

          {/* Filter Bar */}
          <div className="flex items-center gap-4 bg-surface-base p-4 border border-border-default rounded-xl shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
              <input
                type="text"
                placeholder="Search branch by name, code, or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-surface-page border border-border-default rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-primary"
              />
            </div>
            <div className="text-xs text-text-muted hidden sm:block">
              Showing <span className="font-semibold text-text-primary">{filtered.length}</span> branches
            </div>
          </div>

          {/* Branch Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {isBranchesLoading ? (
              Array(6)
                .fill(0)
                .map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)
            ) : filtered.length === 0 ? (
              <div className="col-span-full text-center py-12 text-text-muted bg-surface-base border border-border-default rounded-2xl">
                No branches found matching your search.
              </div>
            ) : (
              filtered.map((b) => {
                const isCurrentActive = selectedBranchId === b.id;
                const branchSpecificLoginUrl = `${webLoginUrl}?branch=${encodeURIComponent(b.code || b.id)}`;
                
                // Find assigned staff or manager
                const assignedStaff = allUsers.filter((u: any) =>
                  u.branches?.some((br: any) => br.branchId === b.id || br.branch?.id === b.id)
                );
                const manager = assignedStaff.find((u: any) =>
                  u.roles?.some((r: any) => r.role?.name?.toLowerCase().includes('admin') || r.role?.name?.toLowerCase().includes('manager'))
                ) || assignedStaff[0] || {
                  id: `usr_${b.code?.toLowerCase() || 'admin'}`,
                  email: b.email || `manager.${b.code?.toLowerCase()}@medcare.com`,
                  firstName: 'Branch',
                  lastName: 'Admin',
                };

                const defaultBranchPassword = 'Admin@123';
                const isPasswordVisible = !!showPasswordMap[b.id];

                const handoverText = `🏪 MEDCARE PHARMACY - BRANCH ACCESS PACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Branch Name : ${b.name} (${b.code})
Address     : ${b.address || 'N/A'}, ${b.city || ''}
Phone       : ${b.phone || 'N/A'}

🌐 Web Login URL : ${branchSpecificLoginUrl}
👤 User ID      : ${manager.id}
📧 Login Email  : ${manager.email}
🔑 Password     : ${defaultBranchPassword}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Note: When logged in, your inventory and POS are completely isolated to this branch.`;

                return (
                  <Card
                    key={b.id}
                    className={`bg-surface-base border transition-all duration-200 shadow-sm hover:shadow-md rounded-2xl overflow-hidden ${
                      isCurrentActive
                        ? 'border-accent-primary ring-2 ring-accent-primary/20'
                        : 'border-border-default hover:border-accent-primary/50'
                    }`}
                  >
                    <CardHeader className="border-b border-border-default bg-surface-raised/40 p-4 pb-3 flex flex-row items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-accent-primary/10 text-accent-primary border border-accent-primary/20 rounded-md">
                            {b.code}
                          </span>
                          <CardTitle className="text-sm font-bold text-text-primary">{b.name}</CardTitle>
                        </div>
                        {b.city && (
                          <p className="text-[11px] text-text-muted mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-text-muted" />
                            {b.address ? `${b.address}, ` : ''}{b.city}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isCurrentActive && (
                          <Badge variant="success" className="text-[10px] px-2 py-0.5">
                            Active Context
                          </Badge>
                        )}
                        <Badge variant={b.isActive ? 'default' : 'error'} className="text-[10px]">
                          {b.isActive ? 'Live' : 'Disabled'}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 space-y-4 text-xs">
                      {/* 1. Direct Web Login URL Section */}
                      <div className="p-2.5 bg-surface-page rounded-xl border border-border-default space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-text-muted font-medium">
                          <span className="flex items-center gap-1.5">
                            <ExternalLink className="w-3.5 h-3.5 text-accent-primary" />
                            Web Page Login URL
                          </span>
                          <button
                            onClick={() => handleCopy(branchSpecificLoginUrl, `url_${b.id}`)}
                            className="text-accent-primary hover:underline flex items-center gap-1 font-semibold"
                          >
                            {copiedKey === `url_${b.id}` ? (
                              <>
                                <Check className="w-3 h-3 text-status-success" />
                                <span className="text-status-success">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="font-mono text-[11px] text-text-secondary bg-surface-base px-2.5 py-1.5 rounded-lg border border-border-default truncate select-all">
                          {branchSpecificLoginUrl}
                        </div>
                      </div>

                      {/* 2. Branch Manager Credentials Box */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-border-default space-y-2.5">
                        <div className="flex items-center justify-between border-b border-border-default/60 pb-1.5">
                          <span className="font-semibold text-text-primary text-[11px] flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-accent-primary" />
                            Branch Admin Credentials
                          </span>
                          <span className="text-[10px] text-text-muted bg-surface-base px-1.5 py-0.5 rounded border border-border-default">
                            Role: Branch Manager
                          </span>
                        </div>

                        {/* User ID */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-text-muted text-[11px]">
                            <User className="w-3 h-3" />
                            <span>User ID:</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] text-text-secondary truncate max-w-[130px]">
                              {manager.id}
                            </span>
                            <button
                              onClick={() => handleCopy(manager.id, `uid_${b.id}`)}
                              className="p-1 hover:bg-surface-raised rounded text-text-muted hover:text-text-primary transition"
                              title="Copy User ID"
                            >
                              {copiedKey === `uid_${b.id}` ? <Check className="w-3 h-3 text-status-success" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>

                        {/* Email */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-text-muted text-[11px]">
                            <Mail className="w-3 h-3" />
                            <span>Email:</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] text-text-secondary truncate max-w-[140px]">
                              {manager.email}
                            </span>
                            <button
                              onClick={() => handleCopy(manager.email, `email_${b.id}`)}
                              className="p-1 hover:bg-surface-raised rounded text-text-muted hover:text-text-primary transition"
                              title="Copy Email"
                            >
                              {copiedKey === `email_${b.id}` ? <Check className="w-3 h-3 text-status-success" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>

                        {/* Password */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-text-muted text-[11px]">
                            <KeyRound className="w-3 h-3" />
                            <span>Password:</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-semibold text-text-primary">
                              {isPasswordVisible ? defaultBranchPassword : '••••••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(b.id)}
                              className="p-1 hover:bg-surface-raised rounded text-text-muted hover:text-text-primary transition"
                              title={isPasswordVisible ? 'Hide Password' : 'Show Password'}
                            >
                              {isPasswordVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(defaultBranchPassword, `pwd_${b.id}`)}
                              className="p-1 hover:bg-surface-raised rounded text-text-muted hover:text-text-primary transition"
                              title="Copy Password"
                            >
                              {copiedKey === `pwd_${b.id}` ? <Check className="w-3 h-3 text-status-success" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* 3. Branch Stats */}
                      <div className="flex items-center justify-between pt-1 text-[11px] text-text-muted border-t border-border-default">
                        <span>Staff: <strong className="text-text-primary">{b._count?.memberships || assignedStaff.length || 1}</strong> users</span>
                        <span>Batches: <strong className="text-text-primary">{b._count?.batches || 0}</strong></span>
                        <span>Sales: <strong className="text-text-primary">{b._count?.sales || 0}</strong></span>
                      </div>

                      {/* 4. Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <Button
                          variant={isCurrentActive ? 'secondary' : 'primary'}
                          size="sm"
                          onClick={() => {
                            setSelectedBranchId(b.id);
                            alert(`Switched active context to "${b.name}" (${b.code}). You are now viewing this branch's data.`);
                          }}
                          className="w-full text-xs font-semibold"
                        >
                          <LogIn className="w-3.5 h-3.5 mr-1.5" />
                          {isCurrentActive ? 'Active Branch' : 'Switch Context'}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(handoverText, `pack_${b.id}`)}
                          className="w-full text-xs"
                        >
                          {copiedKey === `pack_${b.id}` ? (
                            <>
                              <CheckCheck className="w-3.5 h-3.5 mr-1 text-status-success" />
                              <span className="text-status-success font-semibold">Pack Copied!</span>
                            </>
                          ) : (
                            <>
                              <Share2 className="w-3.5 h-3.5 mr-1 text-text-muted" />
                              <span>Copy Pack</span>
                            </>
                          )}
                        </Button>
                      </div>

                      {!b.isDefault && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteModalBranch(b);
                              setAdminEmail(user?.email || 'chiku542254@gmail.com');
                              setAdminPassword('');
                              setConfirmBranchCode('');
                            }}
                            className="w-full py-1.5 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete Branch (Re-Login Required)
                          </button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Create Branch Modal */}
          {isCreateModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-surface-base border border-border-default rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-border-default pb-3">
                  <h3 className="text-base font-bold text-text-primary">Register New Store Branch</h3>
                  <button
                    onClick={() => setIsCreateModalOpen(false)}
                    className="text-text-muted hover:text-text-primary text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-text-muted font-medium mb-1">Branch Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Apollo Pharmacy North"
                      value={newBranch.name}
                      onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent-primary font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted font-medium mb-1">Branch Code *</label>
                    <input
                      type="text"
                      placeholder="e.g. BR-03"
                      value={newBranch.code}
                      onChange={(e) => setNewBranch({ ...newBranch, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-text-primary font-mono focus:outline-none focus:border-accent-primary font-bold"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-text-muted font-medium mb-1">Street Address</label>
                    <input
                      type="text"
                      placeholder="Shop 12, Ground Floor, Medical Market"
                      value={newBranch.address}
                      onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted font-medium mb-1">City *</label>
                    <input
                      type="text"
                      placeholder="Giridih / Mumbai"
                      value={newBranch.city}
                      onChange={(e) => setNewBranch({ ...newBranch, city: e.target.value })}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted font-medium mb-1">State (Indian State) *</label>
                    <select
                      value={newBranch.state}
                      onChange={(e) => setNewBranch({ ...newBranch, state: e.target.value })}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent-primary font-semibold"
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st} className="bg-surface-base text-text-primary">
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-text-muted font-medium mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={newBranch.phone}
                      onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent-primary font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted font-medium mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="branch@medcare.com"
                      value={newBranch.email}
                      onChange={(e) => setNewBranch({ ...newBranch, email: e.target.value })}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent-primary"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border-default">
                  <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => createBranchMutation.mutate(newBranch)}
                    disabled={!newBranch.name || !newBranch.code || createBranchMutation.isPending}
                  >
                    {createBranchMutation.isPending ? 'Registering...' : 'Create Branch'}
                  </Button>
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
                    <AlertTriangle className="w-5 h-5" />
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
                  <p className="font-bold">⚠️ Irreversible Action:</p>
                  <p className="text-[11px]">
                    You are deleting branch <strong>{deleteModalBranch.name} ({deleteModalBranch.code})</strong>. To prevent unauthorized deletions, you must re-authenticate with your Super Admin credentials.
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
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setDeleteModalBranch(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={secureDeleteMutation.isPending}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {secureDeleteMutation.isPending ? 'Verifying & Deleting...' : 'Re-Authenticate & Delete Branch'}
                    </Button>
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
