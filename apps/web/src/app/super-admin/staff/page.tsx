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
            title="Organization Staff Directory & Assignments"
            description="Manage staff members across all branches, control role permissions, and execute branch re-assignments."
            badge={<Badge variant="info">{staffList.length} Staff Members</Badge>}
            actions={
              <Link href="/super-admin">
                <Button variant="secondary" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Back to Control Center
                </Button>
              </Link>
            }
          />

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-surface-base p-4 border border-border-default rounded-xl">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
              <input
                type="text"
                placeholder="Search staff by name, email, phone..."
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
            </select>
          </div>

          {/* Staff Table */}
          <Card className="bg-surface-base border-border-default">
            <CardHeader className="border-b border-border-default pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-accent-primary" />
                Staff Members & Active Branch Roles
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-surface-raised text-text-muted uppercase text-[10px] font-semibold border-b border-border-default">
                  <tr>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Assigned Branches</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default text-text-primary">
                  {isStaffLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-text-muted">
                        Loading staff directory...
                      </td>
                    </tr>
                  ) : staffList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-text-muted">
                        No staff members found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    staffList.map((user) => (
                      <tr key={user.id} className="hover:bg-surface-raised transition">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-text-primary">
                            {user.firstName} {user.lastName || ''}
                          </div>
                          <span className="text-[10px] text-text-muted font-mono">{user.id}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-text-secondary">{user.email}</div>
                          <div className="text-text-muted">{user.mobile || '—'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{user.role}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {user.assignedBranches?.length > 0 ? (
                              user.assignedBranches.map((b: any) => (
                                <span
                                  key={b.branchId}
                                  className="px-1.5 py-0.5 bg-surface-raised border border-border-default rounded text-[10px] font-mono"
                                >
                                  {b.branchCode}
                                </span>
                              ))
                            ) : (
                              <span className="text-text-muted">None</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={user.isActive ? 'success' : 'error'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setTransferModalUser(user);
                              setTargetBranchId(user.primaryBranchId || branchList[0]?.id || '');
                            }}
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5 mr-1" />
                            Transfer Branch
                          </Button>
                        </td>
                      </tr>
                    ))
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
                    className="text-text-muted hover:text-text-primary"
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
                    <label className="block text-text-muted font-medium mb-1.5">
                      Select Target Destination Branch *
                    </label>
                    <select
                      value={targetBranchId}
                      onChange={(e) => setTargetBranchId(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent-primary"
                    >
                      {branchList.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code}) — {b.city || 'Main'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <p className="text-[11px] text-text-muted bg-surface-raised p-2.5 rounded-lg border border-border-default">
                    ℹ️ Note: Transferring a staff member reassigns their operational counter while 100% preserving historical sales and invoice audits created under previous branches.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border-default">
                  <Button variant="secondary" onClick={() => setTransferModalUser(null)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
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
