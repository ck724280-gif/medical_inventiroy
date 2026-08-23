'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRightLeft, ArrowLeft } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { EmptyState } from '../../../components/ui/empty-state';

export default function StockTransferNotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6 animate-fade-in">
      <div className="max-w-md w-full text-center space-y-6">
        <EmptyState
          icon={ArrowRightLeft}
          title="Stock Transfer Not Found"
          description="The requested inter-branch transfer record does not exist or has been archived."
        />
        <Link href="/stock-transfers">
          <Button variant="primary" className="inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Stock Transfers
          </Button>
        </Link>
      </div>
    </div>
  );
}
