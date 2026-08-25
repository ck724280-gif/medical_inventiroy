'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Bell,
  Building2,
  LogOut,
  Maximize2,
  Sun,
  Moon,
  Search,
} from 'lucide-react';
import { useAuthStore } from '../stores/auth-store';
import { useBrandingStore } from '../stores/branding-store';
import { useUiStore } from '../stores/ui-store';
import { useThemeStore } from '../stores/theme-store';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { GlobalCommandPalette } from './global-command-palette';
import { SmartAutocomplete } from './ui/smart-autocomplete';
import { Badge } from './ui/badge';

export function Header() {
  const router = useRouter();
  const { user, selectedBranchId, setSelectedBranchId, logout } = useAuthStore();
  const { name: storeName } = useBrandingStore();
  const { toggleMobileSidebar } = useUiStore();
  const { theme, toggleTheme } = useThemeStore();
  const [showNotifications, setShowNotifications] = useState(false);

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const res = await apiClient.get('/notifications/unread-count');
      return res.data?.data || res.data || {};
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  const unreadCount = notificationsData?.unreadCount ?? 0;

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      // ignore
    } finally {
      logout();
      router.push('/login');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <>
      <GlobalCommandPalette />
      <header className="h-16 px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-20 select-none bg-surface-base border-b border-border-default transition-colors duration-200">
        {/* Left: Mobile Menu Button & Store Badge */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Mobile Hamburger Toggle */}
          <button
            onClick={toggleMobileSidebar}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
            title="Open Navigation"
            aria-label="Open Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Store Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs bg-surface-raised border border-border-default text-text-primary shadow-sm">
            <Building2 className="w-4 h-4 text-accent-primary flex-shrink-0" />
            <span className="font-semibold text-text-primary truncate max-w-[160px] sm:max-w-none">
              {storeName || 'Medical Store'}
            </span>
            <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              ● Online
            </span>
          </div>
        </div>

        {/* Center: Universal Tally-Style Top Search Box */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-2">
          <SmartAutocomplete
            placeholder="Universal Search across ERP (Ctrl+K)..."
            hotkey="k"
            minChars={1}
            clearOnSelect={true}
            fetchResults={async (q, signal) => {
              const res = await apiClient.get('/search/universal', {
                params: { q, branchId: selectedBranchId || undefined, limit: 15 },
                signal,
              });
              return (res.data?.results || []).map((item: any) => ({
                id: item.id,
                title: item.title,
                subtitle: item.subtitle,
                badge: item.badge || item.type.toUpperCase(),
                url: item.url,
                metadata: item.metadata,
              }));
            }}
            onSelect={(item) => {
              if (item.url) router.push(item.url);
            }}
            inputClassName="!py-1.5 !text-xs !bg-surface-raised !border-border-default !rounded-xl !text-text-primary placeholder:!text-text-muted"
          />
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Quick Search Icon for Mobile */}
          <button
            onClick={() => {
              const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true });
              window.dispatchEvent(event);
            }}
            title="Search (Ctrl+K)"
            aria-label="Search"
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Theme Switcher Toggle (Icon Only) */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-accent-primary" />
            )}
          </button>

          {/* Fullscreen Toggle for POS */}
          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            aria-label="Toggle Fullscreen"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              title="Notifications"
              aria-label="Notifications"
              className="w-9 h-9 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <Badge
                  variant="error"
                  size="sm"
                  className="absolute -top-1 -right-1 px-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full pointer-events-none"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </button>
          </div>

          {/* User Info & Logout */}
          <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-border-default">
            <div className="text-right hidden md:block">
              <p className="text-xs font-semibold text-text-primary">
                {user ? `${user.firstName} ${user.lastName}` : 'Guest'}
              </p>
              <p className="text-[10px] text-accent-primary font-mono uppercase font-semibold">
                {user?.roles?.[0] || 'Cashier'}
              </p>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              aria-label="Sign Out"
              className="flex items-center gap-1.5 text-xs text-status-error hover:text-white px-2.5 py-1.5 rounded-xl bg-status-error-bg border border-status-error-border hover:bg-status-error transition-colors font-medium cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
}

