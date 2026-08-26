'use client';

import React, { useEffect } from 'react';
import { useThemeStore } from '../stores/theme-store';
import { useCustomThemeStore } from '../stores/custom-theme-store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { initializeTheme } = useThemeStore();
  const { initialize: initializeCustomTheme } = useCustomThemeStore();

  useEffect(() => {
    initializeTheme();
    initializeCustomTheme();
  }, [initializeTheme, initializeCustomTheme]);

  return <>{children}</>;
}
