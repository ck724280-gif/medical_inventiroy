'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Building2,
  ArrowLeft,
  ArrowRightLeft,
  Search,
  Shield,
  Phone,
  Mail,
  CheckCircle,
  Copy,
  Check,
  Key,
  Globe,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';

import { Sidebar } from '../../../components/sidebar';
import { Header } from '../../../components/header';
import { PageHeader } from '../../../components/ui/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { apiClient } from '../../../lib/api-client';
import { formatDate } from '@medical-inventory/shared-utils';

export default function SuperAdminStaffPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('');
  const [transferModalUser, setTransferModalUser] = useState<any>(null);
  const [targetBranchId, setTargetBranchId] = useState('');
  
  // State for show/hide passwords and copied feedback
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  const getLoginUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/login`;
    }
    return 'https://web-three-rho-95.vercel.app/login';
  };

  const copyFullCredentials = (user: any) => {
    const defaultPassword = user.defaultPassword || 'Admin@123';
    const text = `🏥 MedCare Pharmacy ERP — Staff Login Credentials
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Staff Member : ${user.firstName} ${user.lastName || ''}
🛡️ System Role  : ${user.role}
🆔 User ID      : ${user.id}
📧 Login Email  : ${user.email}
🔑 Password     : ${defaultPassword}
🌐 Web App URL  : ${getLoginUrl()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    copyToClipboard(text, `full-${user.id}`);
  };

  const { data: staff, isLoading: isStaffLoading } = useQuery({
    queryKey: ['super-admin-staff', selectedBranchFilter, selectedRoleFilter, searchTerm],
    queryFn: async () => {
      const res = await apiClient.get('/super-admin/staff', {
        params: {
          branchId: selectedBranchFilter || undefined,
          role: selectedRoleFilter || undefined,
          search: searchTerm || undefined,
        },
      });
      return res.data?.data || res.data;
    },
  });

  const { data: branches } = useQuery({
    queryKey: ['super-admin-branches-list'],
    queryFn: async () => {
      const res = await apiClient.get('/branches');
      return res.data?.data || res.data;
    },
  });

  const transferMutation = useMutation({
    mutationFn: async ({ userId, targetBranchId }: { userId: string; targetBranchId: string }) => {
      const res = await apiClient.post(`/super-admin/staff/${userId}/transfer`, {
        targetBranchId,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-staff'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-branches-matrix'] });
      setTransferModalUser(null);
      setTargetBranchId('');
      alert(data?.message || 'Staff transferred successfully');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to transfer staff');
    },
  });

  const staffList: any[] = staff || [];
  const branchList: any[] = branches || [];

  return (
    <div className="flex h-screen bg-surface-page text-text-primary overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <PageHeader
            title="Organization Staff Directory & Credentials"
            description="Manage staff members, inspect User IDs, copy passwords & web login URLs, and transfer branch assignments."
            badge={<Badge variant="info">{staffList.length} Staff Members</Badge>}
            actions={
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(getLoginUrl(), 'global-url')}
                >
                  {copiedKey === 'global-url' ? (
                    <Check className="w-4 h-4 mr-1.5 text-status-success" />
                  ) : (
                    <Globe className="w-4 h-4 mr-1.5 text-accent-primary" />
                  )}
                  {copiedKey === 'global-url' ? 'URL Copied!' : 'Copy Web Login URL'}
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

          {/* Quick Staff Credentials Cards */}
          <Card className="bg-surface-base border-border-default shadow-sm">
            <CardHeader className="pb-2 border-b border-border-default">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                <Key className="w-4 h-4 text-accent-primary" />
                Super Admin Quick Access — All Staff Default Credentials
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {[
                  { role: 'Super Admin', email: 'admin@medcare.com', pass: 'Admin@123', color: 'border-blue-500/40 bg-blue-500/5' },
                  { role: 'Manager', email: 'manager@medcare.com', pass: 'Admin@123', color: 'border-emerald-500/40 bg-emerald-500/5' },
                  { role: 'Pharmacist', email: 'pharmacist@medcare.com', pass: 'Admin@123', color: 'border-purple-500/40 bg-purple-500/5' },
                  { role: 'Cashier', email: 'cashier@medcare.com', pass: 'Admin@123', color: 'border-amber-500/40 bg-amber-500/5' },
                  { role: 'Inventory Staff', email: 'inventory@medcare.com', pass: 'Admin@123', color: 'border-cyan-500/40 bg-cyan-500/5' },
                  { role: 'Accountant', email: 'accountant@medcare.com', pass: 'Admin@123', color: 'border-rose-500/40 bg-rose-500/5' },
                ].map((item) => (
                  <div
                    key={item.email}
                    className={`p-2.5 rounded-xl border ${item.color} text-xs flex flex-col justify-between space-y-1.5`}
                  >
                    <div>
                      <span className="font-bold text-text-primary block">{item.role}</span>
                      <span className="text-[11px] text-text-muted block truncate" title={item.email}>{item.email}</span>
                      <div className="flex items-center gap-1 mt-1 text-[11px] font-mono text-text-secondary">
                        <Key className="w-3 h-3 text-text-muted" />
                        <span>{item.pass}</span>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `Email: ${item.email}\nPassword: ${item.pass}\nURL: ${getLoginUrl()}`,
                          item.email
                        )
                      }
                      className="w-full mt-1 px-2 py-1 bg-surface-base border border-border-default rounded-md text-[10px] font-semibold text-text-secondary hover:text-accent-primary hover:border-accent-primary flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      {copiedKey === item.email ? (
                        <>
                          <Check className="w-3 h-3 text-status-success" />
                          <span className="text-status-success">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Login</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-surface-base p-4 border border-border-default rounded-xl">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
              <input
                type="text"
                placeholder="Search staff by name, email, user ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-surface-page border border-border-default rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-primary"
              />
            </div>

            <select
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className="px-3 py-2 bg-surface-page border border-border-default rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-primary"
            >
              <option value="">All Branches</option>
              {branchList.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>

            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="px-3 py-2 bg-surface-page border border-border-default rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-primary"
            >
              <option value="">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="BRANCH_MANAGER">Branch Manager</option>
              <option value="PHARMACIST">Pharmacist</option>
              <option value="CASHIER">Cashier</option>
              <option value="ACCOUNTANT">Accountant</option>
              <option value="INVENTORY_STAFF">Inventory Staff</option>
            </select>
          </div>

          {/* Staff Table */}
          <Card className="bg-surface-base border-border-default shadow-sm">
            <CardHeader className="border-b border-border-default pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-accent-primary" />
                Staff Members, Credentials &amp; Branch Permissions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-surface-raised text-text-muted uppercase text-[10px] font-semibold border-b border-border-default">
                  <tr>
                    <th className="py-3 px-4">Staff Member &amp; User ID</th>
                    <th className="py-3 px-4">Login Email</th>
                    <th className="py-3 px-4">Password</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Assigned Branches</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Credentials &amp; Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default text-text-primary">
                  {isStaffLoading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-text-muted">
                        Loading staff directory...
                      </td>
                    </tr>
                  ) : staffList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-text-muted">
                        No staff members found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    staffList.map((user) => {
                      const isPwdVisible = Boolean(showPasswordMap[user.id]);
                      const passwordValue = user.defaultPassword || 'Admin@123';

                      return (
                        <tr key={user.id} className="hover:bg-surface-raised transition">
                          {/* Staff Name & User ID */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-text-primary text-sm">
                              {user.firstName} {user.lastName || ''}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-text-muted font-mono bg-surface-raised px-1.5 py-0.5 rounded border border-border-default">
                                ID: {user.id}
                              </span>
                              <button
                                onClick={() => copyToClipboard(user.id, `id-${user.id}`)}
                                title="Copy User ID"
                                className="text-text-muted hover:text-accent-primary p-0.5 rounded transition cursor-pointer"
                              >
                                {copiedKey === `id-${user.id}` ? (
                                  <Check className="w-3 h-3 text-status-success" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Login Email & Mobile */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-text-primary select-all text-xs">{user.email}</span>
                              <button
                                onClick={() => copyToClipboard(user.email, `email-${user.id}`)}
                                title="Copy Login Email"
                                className="text-text-muted hover:text-accent-primary p-0.5 rounded transition cursor-pointer"
                              >
                                {copiedKey === `email-${user.id}` ? (
                                  <Check className="w-3 h-3 text-status-success" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            {user.mobile && (
                              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-text-muted font-mono">
                                <span>📱 {user.mobile}</span>
                                <button
                                  onClick={() => copyToClipboard(user.mobile, `mobile-${user.id}`)}
                                  title="Copy Mobile Number"
                                  className="text-text-muted hover:text-accent-primary p-0.5 rounded transition cursor-pointer"
                                >
                                  {copiedKey === `mobile-${user.id}` ? (
                                    <Check className="w-2.5 h-2.5 text-status-success" />
                                  ) : (
                                    <Copy className="w-2.5 h-2.5" />
                                  )}
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Password */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 bg-surface-raised/80 px-2 py-1 rounded-md border border-border-default w-fit">
                              <span className="font-mono text-xs text-text-primary">
                                {isPwdVisible ? passwordValue : '••••••••'}
                              </span>
                              <button
                                onClick={() =>
                                  setShowPasswordMap((prev) => ({
                                    ...prev,
                                    [user.id]: !prev[user.id],
                                  }))
                                }
                                title={isPwdVisible ? 'Hide password' : 'Show password'}
                                className="text-text-muted hover:text-text-primary transition cursor-pointer"
                              >
                                {isPwdVisible ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => copyToClipboard(passwordValue, `pwd-${user.id}`)}
                                title="Copy Password"
                                className="text-text-muted hover:text-accent-primary transition cursor-pointer"
                              >
                                {copiedKey === `pwd-${user.id}` ? (
                                  <Check className="w-3 h-3 text-status-success" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Role & Access Scope */}
                          <td className="py-3 px-4">
                            <Badge variant={user.role === 'SUPER_ADMIN' || user.role === 'OWNER' ? 'info' : 'outline'}>
                              {user.role}
                            </Badge>
                            <div className="text-[10px] text-text-muted mt-1">
                              {user.role === 'SUPER_ADMIN' || user.role === 'OWNER'
                                ? '🌐 Multi-Branch Access'
                                : '🔒 Single Branch Only'}
                            </div>
                          </td>

                          {/* Assigned Branch (Single Branch Restriction) */}
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {user.role === 'SUPER_ADMIN' || user.role === 'OWNER' ? (
                                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-md text-[10px] font-bold">
                                  ALL BRANCHES
                                </span>
                              ) : user.assignedBranches?.length > 0 ? (
                                user.assignedBranches.map((b: any) => (
                                  <span
                                    key={b.branchId}
                                    className="px-2 py-0.5 bg-surface-raised border border-border-default rounded-md text-[10px] font-mono font-bold text-text-primary"
                                  >
                                    📍 {b.branchCode}
                                  </span>
                                ))
                              ) : (
                                <span className="text-text-muted">Unassigned</span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            <Badge variant={user.isActive ? 'success' : 'error'}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>

                          {/* Credentials & Web URL Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Direct Web Login URL button */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const loginUrl = `${getLoginUrl()}?email=${encodeURIComponent(user.email)}`;
                                  copyToClipboard(loginUrl, `url-${user.id}`);
                                }}
                                title="Copy direct Web Login URL for this user"
                              >
                                {copiedKey === `url-${user.id}` ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 mr-1 text-status-success" />
                                    <span className="text-status-success">URL Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Globe className="w-3.5 h-3.5 mr-1 text-accent-primary" />
                                    <span>Copy URL</span>
                                  </>
                                )}
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyFullCredentials(user)}
                                title="Copy full credentials package"
                              >
                                {copiedKey === `full-${user.id}` ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 mr-1 text-status-success" />
                                    <span className="text-status-success">Pack Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 mr-1" />
                                    <span>Copy Pack</span>
                                  </>
                                )}
                              </Button>

                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setTransferModalUser(user);
                                  setTargetBranchId(user.primaryBranchId || branchList[0]?.id || '');
                                }}
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5 mr-1" />
                                Transfer
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Transfer Branch Modal */}
          {transferModalUser && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-surface-base border border-border-default rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-border-default pb-3">
                  <h3 className="text-base font-bold text-text-primary">Transfer Staff Member</h3>
                  <button
                    onClick={() => setTransferModalUser(null)}
                    className="text-text-muted hover:text-text-primary cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-text-muted block mb-1">Staff Member</span>
                    <span className="font-bold text-sm text-text-primary">
                      {transferModalUser.firstName} {transferModalUser.lastName || ''} ({transferModalUser.email})
                    </span>
                  </div>

                  <div>
                    <span className="text-text-muted block mb-1">Current Primary Branch</span>
                    <span className="font-semibold text-text-secondary">
                      {transferModalUser.primaryBranch?.name || 'Main Branch'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-text-muted font-medium mb-1.5">
                      Target Destination Branch *
                    </label>
                    <select
                      value={targetBranchId}
                      onChange={(e) => setTargetBranchId(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                    >
                      <option value="">Select Target Branch...</option>
                      {branchList.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code}) — {b.city || 'HQ'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-border-default">
                  <Button variant="secondary" size="sm" onClick={() => setTransferModalUser(null)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!targetBranchId || transferMutation.isPending}
                    onClick={() =>
                      transferMutation.mutate({
                        userId: transferModalUser.id,
                        targetBranchId,
                      })
                    }
                  >
                    {transferMutation.isPending ? 'Transferring...' : 'Confirm Transfer'}
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
