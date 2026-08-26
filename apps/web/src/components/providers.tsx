'use client';

import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth-store';
import { useBrandingStore } from '../stores/branding-store';

import { ThemeProvider } from './theme-provider';

import { apiClient } from '../lib/api-client';

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

    // Instant warmup ping to wake up cloud server immediately on page load
    apiClient.get('/health').catch(() => {});

    // Keepalive ping every 3 minutes to prevent free tier server from sleeping
    const keepalive = setInterval(() => {
      apiClient.get('/health').catch(() => {});
    }, 180000);

    return () => clearInterval(keepalive);
  }, [initializeAuth, fetchBranding]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}

