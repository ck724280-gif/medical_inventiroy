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

export default function SuperAdminBranchesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newBranch, setNewBranch] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    phone: '',
    email: '',
  });

  const { data: branches, isLoading } = useQuery({
    queryKey: ['super-admin-branches-list'],
    queryFn: async () => {
      const res = await apiClient.get('/branches');
      return res.data?.data || res.data;
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

  const allBranches: any[] = branches || [];
  const filtered = allBranches.filter(
    (b) =>
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
            description="Create, configure, and manage up to 50 active branches across your organization."
            badge={<Badge variant="outline">{allBranches.length} / 50 Branches</Badge>}
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
          <div className="flex items-center gap-4 bg-surface-base p-4 border border-border-default rounded-xl">
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
          </div>

          {/* Branch Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              Array(6)
                .fill(0)
                .map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)
            ) : filtered.length === 0 ? (
              <div className="col-span-3 text-center py-12 text-text-muted bg-surface-base border border-border-default rounded-xl">
                No branches found.
              </div>
            ) : (
              filtered.map((b) => (
                <Card key={b.id} className="bg-surface-base border-border-default hover:border-accent-primary/50 transition">
                  <CardHeader className="border-b border-border-default pb-3 flex flex-row items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 bg-surface-raised border border-border-default rounded">
                          {b.code}
                        </span>
                        <CardTitle className="text-sm font-semibold">{b.name}</CardTitle>
                      </div>
                    </div>
                    <Badge variant={b.isActive ? 'success' : 'error'}>
                      {b.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-2.5 text-xs">
                    <div className="flex items-center gap-2 text-text-muted">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{b.address ? `${b.address}, ${b.city || ''}` : 'No address set'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-text-muted">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{b.phone || 'No phone'}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border-default">
                      <span className="text-text-muted">Staff: {b._count?.memberships || 0} users</span>
                      <span className="text-text-muted">Batches: {b._count?.batches || 0}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Create Branch Modal */}
          {isCreateModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-surface-base border border-border-default rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-border-default pb-3">
                  <h3 className="text-base font-bold text-text-primary">Register New Branch</h3>
                  <button
                    onClick={() => setIsCreateModalOpen(false)}
                    className="text-text-muted hover:text-text-primary"
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
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted font-medium mb-1">Branch Code *</label>
                    <input
                      type="text"
                      placeholder="e.g. BR-02"
                      value={newBranch.code}
                      onChange={(e) => setNewBranch({ ...newBranch, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-text-primary font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-text-muted font-medium mb-1">Street Address</label>
                    <input
                      type="text"
                      placeholder="Commercial Complex, Sector 4"
                      value={newBranch.address}
                      onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted font-medium mb-1">City</label>
                    <input
                      type="text"
                      placeholder="Mumbai"
                      value={newBranch.city}
                      onChange={(e) => setNewBranch({ ...newBranch, city: e.target.value })}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted font-medium mb-1">Phone</label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={newBranch.phone}
                      onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-text-primary"
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
