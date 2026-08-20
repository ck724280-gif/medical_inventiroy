'use client';

import React, { useEffect } from 'react';
import { useThemeStore } from '../stores/theme-store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { initializeTheme } = useThemeStore();

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  return <>{children}</>;
}
