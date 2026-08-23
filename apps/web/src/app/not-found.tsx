import React from 'react';
import Link from 'next/link';
import { Button } from '../components/ui';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-page text-text-primary p-4">
      <div className="max-w-md w-full text-center space-y-4 bg-surface-base p-8 rounded-2xl border border-border shadow-card animate-fade-in">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-status-error-bg text-status-error mb-2">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">404 - Page Not Found</h1>
        <p className="text-sm text-text-muted">
          The page or medical record you are looking for does not exist or has been moved.
        </p>
        <div className="pt-2">
          <Link href="/">
            <Button variant="primary" size="md" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
