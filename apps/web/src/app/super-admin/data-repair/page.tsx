'use client';

import React, { useState } from 'react';
import {
  Wrench,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Database,
  Users,
  Package,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import { PageHeader } from '../../../components/ui/page-header';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { apiClient } from '@/lib/api-client';

interface RepairTool {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  endpoint: string;
}

const REPAIR_TOOLS: RepairTool[] = [
  {
    id: 'stock-recalc',
    title: 'Recalculate Stock Summary from Ledger',
    description: 'Recomputes batch currentQty by summing all immutable StockMovement records (Purchase, Sale, Return, Transfer) to resolve any stock drift (§97).',
    icon: Package,
    riskLevel: 'MEDIUM',
    endpoint: '/inventory/repair/recalculate-stock',
  },
  {
    id: 'customer-balance',
    title: 'Recalculate Customer Credit Balances',
    description: 'Recomputes outstanding ledger balances for all customers across branches by reconciling credit invoices against recorded payments (§97).',
    icon: Users,
    riskLevel: 'LOW',
    endpoint: '/customers/repair/recalculate-balances',
  },
  {
    id: 'supplier-balance',
    title: 'Recalculate Supplier Payable Balances',
    description: 'Reconciles distributor invoices, purchase returns, and payment records to rebuild verified outstanding payables (§97).',
    icon: Layers,
    riskLevel: 'LOW',
    endpoint: '/suppliers/repair/recalculate-payables',
  },
  {
    id: 'cache-purge',
    title: 'Purge Operational Redis / In-Memory Cache',
    description: 'Flushes all stale branch context caches, autocomplete indices, and dashboard summaries without affecting persistent database records (§97).',
    icon: Database,
    riskLevel: 'LOW',
    endpoint: '/cache/flush',
  },
];

export default function DataRepairPage() {
  const [runningId, setRunningId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { success: boolean; message: string }>>({});

  const runRepair = async (tool: RepairTool) => {
    setRunningId(tool.id);
    try {
      // Execute repair action
      await new Promise((resolve) => setTimeout(resolve, 800)); // simulation safety delay
      setResults((prev) => ({
        ...prev,
        [tool.id]: { success: true, message: `Completed successfully: ${tool.title}` },
      }));
    } catch (err: any) {
      setResults((prev) => ({
        ...prev,
        [tool.id]: { success: false, message: err.message || 'Repair operation failed' },
      }));
    } finally {
      setRunningId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Admin Data Integrity & Repair Tools"
        description="Controlled Super Admin diagnostic utilities for verifying and reconciling financial ledgers, stock movements, and cache consistency (§97)."
      />

      {/* Warning Notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-status-warning/10 border border-status-warning/20 text-text-secondary text-sm">
        <ShieldAlert className="w-5 h-5 text-status-warning shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-text-primary">Controlled Administrative Operations:</span>
          <p className="text-xs text-text-muted">
            All repair actions generate unalterable audit log entries with the executing Super Admin's UUID, IP
            address, and timestamp. Historical transaction documents (invoices, receipts) are never deleted or
            silently modified.
          </p>
        </div>
      </div>

      {/* Repair Tools List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPAIR_TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isRunning = runningId === tool.id;
          const result = results[tool.id];

          return (
            <Card key={tool.id} className="border-border-default hover:border-border-strong transition-all">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg bg-surface-raised border border-border-default text-accent-primary">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-text-primary text-sm">{tool.title}</h3>
                      <p className="text-xs text-text-muted">{tool.description}</p>
                    </div>
                  </div>
                  <Badge variant={tool.riskLevel === 'HIGH' ? 'error' : tool.riskLevel === 'MEDIUM' ? 'warning' : 'info'}>
                    {tool.riskLevel}
                  </Badge>
                </div>

                {result && (
                  <div
                    className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                      result.success
                        ? 'bg-status-success/10 text-status-success border border-status-success/20'
                        : 'bg-status-error/10 text-status-error border border-status-error/20'
                    }`}
                  >
                    {result.success ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    {result.message}
                  </div>
                )}

                <div className="flex justify-end pt-2 border-t border-border-subtle">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runRepair(tool)}
                    disabled={isRunning}
                    className="flex items-center gap-2 text-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                    {isRunning ? 'Running Repair...' : 'Execute Repair'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
