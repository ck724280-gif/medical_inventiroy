'use client';

import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth-store';
import { useBrandingStore } from '../stores/branding-store';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 30000,
          },
        },
      })
  );

  const initializeAuth = useAuthStore((s) => s.initialize);
  const fetchBranding = useBrandingStore((s) => s.fetchBranding);

  useEffect(() => {
    initializeAuth();
    fetchBranding();
  }, [initializeAuth, fetchBranding]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
