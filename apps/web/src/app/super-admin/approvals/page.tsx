'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  RefreshCw,
  AlertTriangle,
  FileText,
  DollarSign,
  Package,
} from 'lucide-react';
import { PageHeader } from '../../../components/ui/page-header';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';
import { EmptyState } from '../../../components/ui/empty-state';
import { apiClient } from '@/lib/api-client';

export default function ApprovalsPage() {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('PENDING');
  const [filterBranchId, setFilterBranchId] = useState<string>('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['approvals', selectedStatus, filterBranchId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedStatus) params.append('status', selectedStatus);
      if (filterBranchId) params.append('branchId', filterBranchId);
      const res = await apiClient.get(`/approvals?${params.toString()}`);
      return res.data;
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const res = await apiClient.patch(`/approvals/${id}/resolve`, { status, notes });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approvals-count'] });
    },
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'PURCHASE_APPROVAL':
        return <Package className="w-5 h-5 text-accent-primary" />;
      case 'HIGH_DISCOUNT':
        return <DollarSign className="w-5 h-5 text-status-warning" />;
      case 'INVOICE_CANCEL':
        return <AlertTriangle className="w-5 h-5 text-status-error" />;
      default:
        return <FileText className="w-5 h-5 text-text-muted" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge variant="success">Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="error">Rejected</Badge>;
      case 'CANCELLED':
        return <Badge variant="default">Cancelled</Badge>;
      default:
        return <Badge variant="warning">Pending Review</Badge>;
    }
  };

  const items = data?.items || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Approval Workflow Management"
        description="Review and authorize sensitive operations including purchases, returns, stock adjustments, high-value discounts, and cancellations."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        }
      />

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border-default pb-4">
        {['PENDING', 'APPROVED', 'REJECTED', ''].map((status) => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              selectedStatus === status
                ? 'bg-accent-primary text-white shadow-sm'
                : 'bg-surface-base text-text-secondary hover:bg-surface-raised border border-border-default'
            }`}
          >
            {status === 'PENDING'
              ? 'Pending Review'
              : status === 'APPROVED'
              ? 'Approved'
              : status === 'REJECTED'
              ? 'Rejected'
              : 'All Requests'}
          </button>
        ))}
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title="No approval requests found"
          description={
            selectedStatus === 'PENDING'
              ? 'All sensitive operations have been reviewed and approved.'
              : 'No approval requests match the current filter.'
          }
        />
      ) : (
        <div className="space-y-4">
          {items.map((req: any) => (
            <Card key={req.id} className="border-border-default hover:border-border-strong transition-all">
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-lg bg-surface-raised border border-border-default">
                      {getActionIcon(req.action)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-text-primary">
                          {req.action.replace(/_/g, ' ')}
                        </span>
                        {getStatusBadge(req.status)}
                        <span className="text-xs text-text-muted bg-surface-raised px-2 py-0.5 rounded border border-border-default">
                          {req.branch?.name || 'Branch'}
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary">
                        {req.reason || `Requested by ${req.requester?.firstName} ${req.requester?.lastName || ''}`}
                      </p>
                      {req.requestedValue && (
                        <p className="text-xs text-text-muted">
                          Value: <span className="font-mono font-medium text-text-primary">{req.requestedValue}</span>
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-text-muted">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(req.requestedAt).toLocaleString()}
                        </span>
                        <span>•</span>
                        <span>By: {req.requester?.firstName} {req.requester?.lastName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons for Pending */}
                  {req.status === 'PENDING' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => resolveMutation.mutate({ id: req.id, status: 'REJECTED' })}
                        disabled={resolveMutation.isPending}
                        className="flex items-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => resolveMutation.mutate({ id: req.id, status: 'APPROVED' })}
                        disabled={resolveMutation.isPending}
                        className="flex items-center gap-1.5"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
