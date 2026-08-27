'use client';

import React, { useState, useEffect } from 'react';
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
  RotateCcw,
  Clock,
  Flame,
  ShieldCheck,
  Sparkles,
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
import { formatDate } from '@medical-inventory/shared-utils';

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

function CountdownTimer({ targetDate }: { targetDate: string | Date }) {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    const calculate = () => {
      const difference = new Date(targetDate).getTime() - new Date().getTime();
      if (difference <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      setTimeLeft({ hours, minutes, seconds });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!timeLeft) return null;

  return (
    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
      {String(timeLeft.hours).padStart(2, '0')}h : {String(timeLeft.minutes).padStart(2, '0')}m : {String(timeLeft.seconds).padStart(2, '0')}s
    </span>
  );
}

export default function SuperAdminBranchesPage() {
  const queryClient = useQueryClient();
  const { user, selectedBranchId, setSelectedBranchId } = useAuthStore();

  const [deleteModalBranch, setDeleteModalBranch] = useState<any | null>(null);
  const [purgeModalBranch, setPurgeModalBranch] = useState<any | null>(null);
  const [adminEmail, setAdminEmail] = useState(user?.email || 'chiku542254@gmail.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [confirmBranchCode, setConfirmBranchCode] = useState('');
  const [deletionReason, setDeletionReason] = useState('');

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
    setShowPasswordMap((prev) => ({ ...prev, [branchId]: !prev[branchId] }));
  };

  // Queries
  const { data: branchesData, isLoading: isBranchesLoading } = useQuery({
    queryKey: ['super-admin-branches-list'],
    queryFn: async () => {
      const res = await apiClient.get('/branches');
      return res.data?.data || res.data;
    },
  });

  const { data: usersData } = useQuery({
    queryKey: ['super-admin-staff-list'],
    queryFn: async () => {
      const res = await apiClient.get('/super-admin/staff');
      return res.data?.data || res.data;
    },
  });

  // 1. Mutation: Schedule Branch Deletion (24-Hour Grace Period)
  const scheduleDeleteMutation = useMutation({
    mutationFn: async ({ branchId, email, password, reason }: { branchId: string; email: string; password?: string; reason?: string }) => {
      const res = await apiClient.post(`/branches/${branchId}/schedule-delete`, { email, password, reason });
      return res.data;
    },
    onSuccess: (res: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-branches-list'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-overview'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-branches-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['active-branches-list'] });
      queryClient.invalidateQueries({ queryKey: ['branches'] });

      if (selectedBranchId === variables.branchId) {
        const remaining = allBranches.find((b: any) => b.id !== variables.branchId && !b.deletedAt);
        if (remaining) {
          setSelectedBranchId(remaining.id);
        }
      }

      setDeleteModalBranch(null);
      setAdminPassword('');
      setConfirmBranchCode('');
      setDeletionReason('');
      alert(res?.message || 'Branch scheduled for deletion. You can undo anytime within 24 hours.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to schedule branch deletion. Please check Super Admin password.');
    },
  });

  // 2. Mutation: Undo / Restore Branch
  const restoreBranchMutation = useMutation({
    mutationFn: async (branchId: string) => {
      const res = await apiClient.post(`/branches/${branchId}/restore`);
      return res.data;
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-branches-list'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-overview'] });
      queryClient.invalidateQueries({ queryKey: ['active-branches-list'] });
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      alert(res?.message || 'Branch restored successfully! All data is reactivated.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to restore branch.');
    },
  });

  // 3. Mutation: Immediate Permanent Purge
  const permanentPurgeMutation = useMutation({
    mutationFn: async ({ branchId, email, password }: { branchId: string; email: string; password?: string }) => {
      const res = await apiClient.post(`/branches/${branchId}/permanent-purge`, { email, password });
      return res.data;
    },
    onSuccess: (res: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-branches-list'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-overview'] });
      queryClient.invalidateQueries({ queryKey: ['active-branches-list'] });
      queryClient.invalidateQueries({ queryKey: ['branches'] });

      if (selectedBranchId === variables.branchId) {
        const remaining = allBranches.find((b: any) => b.id !== variables.branchId && !b.deletedAt);
        if (remaining) {
          setSelectedBranchId(remaining.id);
        }
      }

      setPurgeModalBranch(null);
      setAdminPassword('');
      alert(res?.message || 'Branch and all related database records permanently wiped.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to permanently purge branch.');
    },
  });

  // 4. Mutation: Create Branch
  const createMutation = useMutation({
    mutationFn: async (payload: typeof newBranch) => {
      const branchPayload = {
        name: payload.name.trim(),
        code: payload.code.trim().toUpperCase(),
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
        deletedAt: b.deletedAt,
        scheduledPermanentDeleteAt: b.scheduledPermanentDeleteAt,
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
            description="Manage branches, view direct web access URLs, branch admin credentials, and handle 24-hour safety deletion grace periods."
            badge={<Badge variant="outline">{allBranches.filter((b) => !b.deletedAt).length} / 50 Branches Active</Badge>}
            actions={
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(true)}
                  disabled={allBranches.filter((b) => !b.deletedAt).length >= 50}
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
                .map((_, i) => (
                  <Card key={i} className="bg-surface-base border-border-default">
                    <CardHeader className="space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </CardContent>
                  </Card>
                ))
            ) : filtered.length === 0 ? (
              <div className="col-span-full py-12 text-center text-text-muted bg-surface-base border border-border-default rounded-2xl">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold text-base">No Branches Found</p>
                <p className="text-xs text-text-muted mt-1">Try adjusting your search criteria or register a new store branch.</p>
              </div>
            ) : (
              filtered.map((b: any) => {
                const isMainBranch = b.code === 'MAIN-01' || b.isDefault === true;
                const isPendingDeletion = Boolean(b.deletedAt && b.scheduledPermanentDeleteAt);
                const isCurrentActive = selectedBranchId === b.id;

                const assignedStaff = allUsers.filter((u: any) =>
                  Array.isArray(u.assignedBranches)
                    ? u.assignedBranches.some((ab: any) => (ab.branchId || ab.id || ab) === b.id)
                    : (u.primaryBranch?.id === b.id || u.branchId === b.id)
                );

                const manager =
                  assignedStaff.find((u: any) =>
                    ['BRANCH_MANAGER', 'ADMIN', 'MANAGER'].includes(u.role?.toUpperCase() || '')
                  ) ||
                  assignedStaff[0] || {
                    firstName: 'Branch',
                    lastName: 'Manager',
                    email: `manager.${b.code.toLowerCase()}@medcarepharmacy.com`,
                    role: 'Branch Manager',
                  };

                const branchDirectUrl = `${webLoginUrl}?branch=${encodeURIComponent(b.code)}`;
                const defaultBranchPassword = `Pass@${b.code}123`;
                const isPasswordVisible = Boolean(showPasswordMap[b.id]);

                const handoverText = [
                  `🏬 Branch: ${b.name} (${b.code})`,
                  `📍 Address: ${b.address}, ${b.city}, ${b.state}`,
                  `🔗 Login URL: ${branchDirectUrl}`,
                  `👤 Admin User ID: usr_${b.code.toLowerCase()}`,
                  `📧 Email: ${manager.email}`,
                  `🔑 Default Password: ${defaultBranchPassword}`,
                ].join('\n');

                return (
                  <Card
                    key={b.id}
                    className={`bg-surface-base transition-all duration-200 hover:shadow-md ${
                      isPendingDeletion
                        ? 'border-amber-500/40 bg-amber-500/5 shadow-inner'
                        : isCurrentActive
                        ? 'border-accent-primary ring-1 ring-accent-primary/50 shadow-md'
                        : 'border-border-default'
                    }`}
                  >
                    <CardHeader className="border-b border-border-default pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs bg-surface-page px-2 py-0.5 rounded border border-border-default">
                              {b.code}
                            </span>
                            <CardTitle className="text-base font-bold text-text-primary">
                              {b.name}
                            </CardTitle>
                          </div>
                          <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[220px]">
                              {b.address}, {b.city}, {b.state}
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {isMainBranch && (
                            <Badge variant="info" className="text-[10px] bg-accent-primary/10 text-accent-primary font-bold border border-accent-primary/30">
                              HQ Main Branch
                            </Badge>
                          )}
                          {isCurrentActive && !isPendingDeletion && (
                            <Badge variant="success" className="text-[10px]">
                              Active Context
                            </Badge>
                          )}
                          {isPendingDeletion ? (
                            <Badge variant="warning" className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold animate-pulse">
                              Pending Deletion
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              Live
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-4 space-y-4 text-xs">
                      {/* ========================================================= */}
                      {/* PENDING DELETION 24-HOUR GRACE PERIOD BANNER */}
                      {/* ========================================================= */}
                      {isPendingDeletion ? (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-xl border border-amber-300 dark:border-amber-700 space-y-2.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                              24h Safety Undo Window
                            </span>
                            <CountdownTimer targetDate={b.scheduledPermanentDeleteAt} />
                          </div>
                          <p className="text-[11px] text-amber-800 dark:text-amber-300">
                            Branch is disabled for billing. You can undo deletion within 24 hours to restore all data without loss.
                          </p>
                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={restoreBranchMutation.isPending}
                              onClick={() => restoreBranchMutation.mutate(b.id)}
                              className="flex-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <RotateCcw className="w-3.5 h-3.5 mr-1" />
                              Undo / Restore Branch
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setPurgeModalBranch(b);
                                setAdminEmail(user?.email || 'chiku542254@gmail.com');
                                setAdminPassword('');
                              }}
                              className="text-xs"
                            >
                              <Flame className="w-3.5 h-3.5 mr-1" />
                              Purge Now
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      {/* 1. Direct Web Login URL */}
                      <div className="p-2.5 bg-surface-page rounded-xl border border-border-default space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                            <ExternalLink className="w-3 h-3 text-accent-primary" />
                            Web Page Login URL
                          </span>
                          <button
                            onClick={() => handleCopy(branchDirectUrl, `url_${b.id}`)}
                            className="text-[11px] text-accent-primary hover:underline flex items-center gap-1 font-semibold"
                          >
                            {copiedKey === `url_${b.id}` ? <Check className="w-3 h-3 text-status-success" /> : <Copy className="w-3 h-3" />}
                            {copiedKey === `url_${b.id}` ? 'Copied' : 'Copy Link'}
                          </button>
                        </div>
                        <p className="font-mono text-[11px] text-text-secondary truncate select-all bg-surface-base px-2 py-1 rounded border border-border-default">
                          {branchDirectUrl}
                        </p>
                      </div>

                      {/* 2. Admin Credentials Pack */}
                      <div className="p-3 bg-surface-page rounded-xl border border-border-default space-y-2">
                        <div className="flex items-center justify-between pb-1 border-b border-border-default">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                            <Shield className="w-3 h-3 text-accent-primary" />
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
                            <span className="font-mono text-[11px] text-text-primary font-bold">
                              usr_{b.code.toLowerCase()}
                            </span>
                            <button
                              onClick={() => handleCopy(`usr_${b.code.toLowerCase()}`, `uid_${b.id}`)}
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
                          disabled={isPendingDeletion}
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

                      {/* 5. Delete Button (Protected for Main Branch) */}
                      {!isMainBranch && !isPendingDeletion && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteModalBranch(b);
                              setAdminEmail(user?.email || 'chiku542254@gmail.com');
                              setAdminPassword('');
                              setConfirmBranchCode('');
                              setDeletionReason('');
                            }}
                            className="w-full py-1.5 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete Branch (24h Grace Period)
                          </button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* ========================================================= */}
          {/* MODAL 1: SCHEDULE DELETION (24-HOUR GRACE PERIOD) */}
          {/* ========================================================= */}
          {deleteModalBranch && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-surface-base border border-border-default rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs">
                <div className="flex items-center justify-between border-b border-border-default pb-3">
                  <h3 className="text-base font-bold text-text-primary flex items-center gap-2 text-status-error">
                    <AlertTriangle className="w-5 h-5 text-status-error" />
                    Delete Branch (24h Grace Period)
                  </h3>
                  <button
                    onClick={() => setDeleteModalBranch(null)}
                    className="text-text-muted hover:text-text-primary font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 rounded-xl text-xs border border-amber-200 dark:border-amber-800 space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    24-Hour Safety Grace Period:
                  </p>
                  <p>
                    Deleting <strong>{deleteModalBranch.name}</strong> ({deleteModalBranch.code}) will place it into a <strong>24-hour safety undo window</strong>.
                  </p>
                  <p>
                    You can click <strong>"Undo / Restore"</strong> anytime within 24 hours to reactivate this branch with 0 data loss.
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (confirmBranchCode.trim().toUpperCase() !== deleteModalBranch.code.toUpperCase()) {
                      alert(`Confirmation code mismatch! Please type "${deleteModalBranch.code}" exactly.`);
                      return;
                    }
                    scheduleDeleteMutation.mutate({
                      branchId: deleteModalBranch.id,
                      email: adminEmail,
                      password: adminPassword,
                      reason: deletionReason,
                    });
                  }}
                  className="space-y-3 pt-1"
                >
                  <div>
                    <label className="block text-text-muted font-semibold mb-1">
                      Type Branch Code "<strong className="text-text-primary">{deleteModalBranch.code}</strong>" to confirm:
                    </label>
                    <input
                      required
                      type="text"
                      placeholder={deleteModalBranch.code}
                      value={confirmBranchCode}
                      onChange={(e) => setConfirmBranchCode(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-xs font-mono font-bold text-text-primary focus:outline-none focus:border-accent-primary uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted font-semibold mb-1">
                      Super Admin Password *
                    </label>
                    <div className="relative">
                      <input
                        required
                        type={showAdminPassword ? 'text' : 'password'}
                        placeholder="Enter Super Admin Password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-primary pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        className="absolute right-2.5 top-2.5 text-text-muted hover:text-text-primary"
                      >
                        {showAdminPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-text-muted font-semibold mb-1">
                      Reason for Deletion (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Branch closed / relocated"
                      value={deletionReason}
                      onChange={(e) => setDeletionReason(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-border-default">
                    <Button variant="secondary" size="sm" onClick={() => setDeleteModalBranch(null)}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      type="submit"
                      disabled={scheduleDeleteMutation.isPending}
                    >
                      {scheduleDeleteMutation.isPending ? 'Scheduling Deletion...' : 'Confirm 24h Deletion'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* MODAL 2: IMMEDIATE PERMANENT PURGE (SKIP 24H) */}
          {/* ========================================================= */}
          {purgeModalBranch && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-surface-base border border-border-default rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs">
                <div className="flex items-center justify-between border-b border-border-default pb-3">
                  <h3 className="text-base font-bold text-status-error flex items-center gap-2">
                    <Flame className="w-5 h-5 text-status-error" />
                    Immediate Permanent Purge
                  </h3>
                  <button
                    onClick={() => setPurgeModalBranch(null)}
                    className="text-text-muted hover:text-text-primary font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 rounded-xl text-xs border border-rose-200 dark:border-rose-800 space-y-1">
                  <p className="font-bold">⚠ IRREVERSIBLE ACTION:</p>
                  <p>
                    All customers, medicines/batches, invoices, sales, expenses, and staff records for <strong>{purgeModalBranch.name}</strong> will be <strong>permanently deleted right now</strong> across all 35+ tables.
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    permanentPurgeMutation.mutate({
                      branchId: purgeModalBranch.id,
                      email: adminEmail,
                      password: adminPassword,
                    });
                  }}
                  className="space-y-3 pt-1"
                >
                  <div>
                    <label className="block text-text-muted font-semibold mb-1">
                      Confirm Super Admin Password *
                    </label>
                    <input
                      required
                      type="password"
                      placeholder="Enter Admin Password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-border-default">
                    <Button variant="secondary" size="sm" onClick={() => setPurgeModalBranch(null)}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      type="submit"
                      disabled={permanentPurgeMutation.isPending}
                    >
                      {permanentPurgeMutation.isPending ? 'Purging Everything...' : 'Permanently Wipe All Data'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* MODAL 3: CREATE NEW BRANCH */}
          {/* ========================================================= */}
          {isCreateModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-surface-base border border-border-default rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 text-xs">
                <div className="flex justify-between items-center border-b border-border-default pb-3">
                  <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-accent-primary" />
                    Register New Store Branch
                  </h3>
                  <button
                    onClick={() => setIsCreateModalOpen(false)}
                    className="text-text-muted hover:text-text-primary text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-text-muted font-medium mb-1">Branch Name *</label>
                    <Input
                      placeholder="e.g. Apollo Pharmacy Branch 2"
                      value={newBranch.name}
                      onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted font-medium mb-1">Branch Code (Prefix) *</label>
                    <Input
                      placeholder="e.g. BR-03"
                      value={newBranch.code}
                      onChange={(e) => setNewBranch({ ...newBranch, code: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-text-muted font-medium mb-1">Street Address *</label>
                    <Input
                      placeholder="e.g. Shop No 4, Main Market Road"
                      value={newBranch.address}
                      onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted font-medium mb-1">City *</label>
                    <Input
                      placeholder="e.g. Giridih"
                      value={newBranch.city}
                      onChange={(e) => setNewBranch({ ...newBranch, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted font-medium mb-1">State *</label>
                    <select
                      value={newBranch.state}
                      onChange={(e) => setNewBranch({ ...newBranch, state: e.target.value })}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-text-muted font-medium mb-1">Phone Number *</label>
                    <Input
                      placeholder="+91 9876543210"
                      value={newBranch.phone}
                      onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted font-medium mb-1">Email Address</label>
                    <Input
                      placeholder="branch@medcarepharmacy.com"
                      value={newBranch.email}
                      onChange={(e) => setNewBranch({ ...newBranch, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border-default">
                  <Button variant="secondary" size="sm" onClick={() => setIsCreateModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!newBranch.name || !newBranch.code || createMutation.isPending}
                    onClick={() => createMutation.mutate(newBranch)}
                  >
                    {createMutation.isPending ? 'Registering...' : 'Create Branch'}
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
