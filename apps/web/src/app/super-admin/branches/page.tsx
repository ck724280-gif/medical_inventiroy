'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Plus,
  ArrowLeft,
  Edit2,
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

export default function SuperAdminBranchesPage() {
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
    state: '',
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
      const res = await apiClient.post('/branches', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-branches-list'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-overview'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-branches-matrix'] });
      setIsCreateModalOpen(false);
      setNewBranch({ name: '', code: '', address: '', city: '', state: '', phone: '', email: '' });
      alert('Branch created successfully!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to create branch');
    },
  });

  const allBranches = extractDataArray(branchesData);
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
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted font-medium mb-1">Branch Code *</label>
                    <input
                      type="text"
                      placeholder="e.g. BR-03"
                      value={newBranch.code}
                      onChange={(e) => setNewBranch({ ...newBranch, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-text-primary font-mono focus:outline-none focus:border-accent-primary"
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
                    <label className="block text-text-muted font-medium mb-1">City</label>
                    <input
                      type="text"
                      placeholder="Mumbai"
                      value={newBranch.city}
                      onChange={(e) => setNewBranch({ ...newBranch, city: e.target.value })}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted font-medium mb-1">Phone</label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={newBranch.phone}
                      onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
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
        </main>
      </div>
    </div>
  );
}
