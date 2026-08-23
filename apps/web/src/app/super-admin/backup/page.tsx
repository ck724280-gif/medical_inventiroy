'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  HardDrive,
  Download,
  Play,
  RotateCcw,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { PageHeader } from '../../../components/ui/page-header';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Skeleton } from '../../../components/ui/skeleton';
import { EmptyState } from '../../../components/ui/empty-state';
import { apiClient } from '@/lib/api-client';

export default function BackupPage() {
  const queryClient = useQueryClient();

  const { data: backupsData, isLoading, refetch } = useQuery({
    queryKey: ['backup-records'],
    queryFn: async () => {
      const res = await apiClient.get('/backup/history');
      return res.data;
    },
  });

  const triggerBackupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/backup/trigger');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-records'] });
    },
  });

  const backups = backupsData || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Backup Management & Disaster Recovery"
        description="Schedule automatic database snapshots, trigger on-demand backups, and verify snapshot integrity (§30, §31)."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => triggerBackupMutation.mutate()}
              disabled={triggerBackupMutation.isPending}
              className="flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              {triggerBackupMutation.isPending ? 'Creating Snapshot...' : 'Create Backup Now'}
            </Button>
          </div>
        }
      />

      {/* Snapshot Retention Policy Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border-default">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-accent-primary/10 text-accent-primary">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-text-muted">Schedule</span>
              <h4 className="font-semibold text-text-primary text-sm">Daily at 02:00 AM UTC</h4>
              <span className="text-xs text-status-success">Automated cron active</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border-default">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-status-success/10 text-status-success">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-text-muted">Retention Window</span>
              <h4 className="font-semibold text-text-primary text-sm">7-Day Rolling History</h4>
              <span className="text-xs text-text-muted">Auto-purges older archives</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border-default">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-status-info/10 text-status-info">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-text-muted">Encryption</span>
              <h4 className="font-semibold text-text-primary text-sm">AES-256 Encrypted</h4>
              <span className="text-xs text-text-muted">Encrypted at rest</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backup History Table */}
      <Card className="border-border-default">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-accent-primary" />
            Database Snapshot History (§30)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : backups.length === 0 ? (
            <EmptyState
              icon={HardDrive}
              title="No backup records found"
              description="Click 'Create Backup Now' to create your first manual database snapshot."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-raised text-text-muted text-xs uppercase tracking-wider border-b border-border-default">
                  <tr>
                    <th className="py-3 px-4">Filename</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created At</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {backups.map((b: any) => (
                    <tr key={b.id} className="hover:bg-surface-raised transition-colors">
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-text-primary">
                        {b.filename}
                      </td>
                      <td className="py-3 px-4 text-xs text-text-muted">
                        {(b.sizeBytes / 1024 / 1024).toFixed(2)} MB
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={b.status === 'COMPLETED' ? 'success' : 'warning'}>
                          {b.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-xs text-text-muted">
                        {new Date(b.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                          <Download className="w-3.5 h-3.5 mr-1" />
                          Download
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
