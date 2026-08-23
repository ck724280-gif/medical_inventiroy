'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Flag, Save, RefreshCw, Check, X, Shield, Info } from 'lucide-react';
import { PageHeader } from '../../../components/ui/page-header';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';
import { Badge } from '../../../components/ui/badge';
import { apiClient } from '@/lib/api-client';

const FEATURE_DESCRIPTIONS: Record<string, { label: string; desc: string }> = {
  POS: { label: 'Point of Sale (POS)', desc: 'Enables quick counter billing and barcode checkout' },
  CREDIT_SALE: { label: 'Customer Credit Sale', desc: 'Allows dispensing medicines on customer credit ledger' },
  WHOLESALE: { label: 'Wholesale / B2B Billing', desc: 'Enables GST invoice generation for bulk B2B parties' },
  STOCK_TRANSFER: { label: 'Branch Stock Transfer', desc: 'Enables dispatch and receipt of inter-branch inventory' },
  EXPENSE: { label: 'Expense Management', desc: 'Enables logging daily operational branch expenses' },
  CENTRAL_PURCHASE: { label: 'Central Purchase Distribution', desc: 'Allows receiving centrally procured inventory' },
  REPORTS: { label: 'Branch Financial Reports', desc: 'Gives branch managers access to local P&L and sales analytics' },
  IMPORT_EXPORT: { label: 'Data Import & Export', desc: 'Allows CSV/Excel data import and export operations' },
  PURCHASE_ORDERS: { label: 'Purchase Orders (PO)', desc: 'Enables creating draft POs to pharma distributors' },
  SALES_RETURNS: { label: 'Sales Returns & Refunds', desc: 'Enables customer medicine returns and credit notes' },
  PURCHASE_RETURNS: { label: 'Purchase Returns', desc: 'Enables returning defective/expired stock to distributors' },
  CUSTOMER_CREDIT: { label: 'Customer Credit Limits', desc: 'Enforces maximum outstanding credit balances per patient' },
  DISCOUNT_APPROVAL: { label: 'Discount Approval Gate', desc: 'Requires manager approval for discounts exceeding cashier threshold' },
};

export default function FeatureFlagsPage() {
  const queryClient = useQueryClient();
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [localFlags, setLocalFlags] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch all branches
  const { data: branchesData, isLoading: loadingBranches } = useQuery({
    queryKey: ['branches-list'],
    queryFn: async () => {
      const res = await apiClient.get('/branches');
      return res.data;
    },
  });

  const branches = branchesData || [];

  // Automatically select first branch
  React.useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  // Fetch flags for selected branch
  const { data: flagsData, isLoading: loadingFlags } = useQuery({
    queryKey: ['feature-flags', selectedBranchId],
    queryFn: async () => {
      if (!selectedBranchId) return {};
      const res = await apiClient.get(`/feature-flags/branch/${selectedBranchId}`);
      return res.data;
    },
    enabled: !!selectedBranchId,
  });

  React.useEffect(() => {
    if (flagsData) {
      setLocalFlags(flagsData);
      setHasChanges(false);
    }
  }, [flagsData]);

  const toggleFlag = (key: string) => {
    setLocalFlags((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      setHasChanges(true);
      return updated;
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.put(`/feature-flags/branch/${selectedBranchId}/bulk`, localFlags);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags', selectedBranchId] });
      setHasChanges(false);
    },
  });

  const selectedBranch = branches.find((b: any) => b.id === selectedBranchId);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Branch Feature Flags & Module Access"
        description="Configure operational permissions and module availability independently for each pharmacy branch (§20)."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={!hasChanges || saveMutation.isPending}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        }
      />

      {/* Branch Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border-default">
        {loadingBranches ? (
          <Skeleton className="h-9 w-64 rounded-lg" />
        ) : (
          branches.map((branch: any) => (
            <button
              key={branch.id}
              onClick={() => setSelectedBranchId(branch.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedBranchId === branch.id
                  ? 'bg-accent-primary text-white shadow-sm'
                  : 'bg-surface-base text-text-secondary hover:bg-surface-raised border border-border-default'
              }`}
            >
              {branch.name} ({branch.code})
            </button>
          ))
        )}
      </div>

      {/* Notice Banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-accent-primary/5 border border-accent-primary/20 text-text-secondary text-sm">
        <Shield className="w-5 h-5 text-accent-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-text-primary">Server-Side Enforced:</span> Disabling a feature
          flag hides the module on the frontend and blocks API endpoints with a 403 Forbidden on the backend.
        </div>
      </div>

      {/* Feature Flags Grid */}
      {loadingFlags ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(FEATURE_DESCRIPTIONS).map(([key, info]) => {
            const isEnabled = localFlags[key] !== false; // default true
            return (
              <Card
                key={key}
                className={`border transition-all cursor-pointer ${
                  isEnabled
                    ? 'border-border-default hover:border-accent-primary/40 bg-surface-base'
                    : 'border-border-subtle bg-surface-page opacity-75'
                }`}
                onClick={() => toggleFlag(key)}
              >
                <CardContent className="p-5 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text-primary">{info.label}</span>
                      <Badge variant={isEnabled ? 'success' : 'default'}>
                        {isEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-muted">{info.desc}</p>
                    <span className="text-[10px] font-mono text-text-disabled">Key: {key}</span>
                  </div>

                  {/* Toggle Switch */}
                  <div
                    className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors shrink-0 ${
                      isEnabled ? 'bg-accent-primary' : 'bg-surface-raised border border-border-default'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        isEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
