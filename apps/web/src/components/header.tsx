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
} from 'lucide-react';
import { useAuthStore } from '../stores/auth-store';
import { useUiStore } from '../stores/ui-store';
import { useThemeStore } from '../stores/theme-store';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export function Header() {
  const router = useRouter();
  const { user, selectedBranchId, setSelectedBranchId, logout } = useAuthStore();
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

  const branches = Array.isArray(user?.branches) ? user.branches : [];
  const activeBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];

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
    <header className="h-16 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 select-none bg-white dark:bg-[#090d16] border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
      {/* Left: Mobile Menu Button & Branch Selector */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Toggle */}
        <button
          onClick={toggleMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title="Open Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Branch Selector */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
          <Building2 className="w-4 h-4 text-sky-600 dark:text-sky-400 flex-shrink-0" />
          <span className="text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">Branch:</span>
          {branches.length > 1 ? (
            <select
              value={selectedBranchId || ''}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent font-semibold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer text-xs"
            >
              {(Array.isArray(branches) ? branches : []).map((b) => (
                <option key={b.id} value={b.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          ) : (
            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[140px] sm:max-w-none">
              {activeBranch ? `${activeBranch.name} (${activeBranch.code})` : 'Main Branch'}
            </span>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme Switcher Toggle (Light ☀️ / Dark 🌙) */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-sky-500 transition cursor-pointer"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-sky-600" />
              <span className="hidden sm:inline">Dark</span>
            </>
          )}
        </button>

        {/* Fullscreen Toggle for POS */}
        <button
          onClick={toggleFullscreen}
          title="Toggle Fullscreen"
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl relative text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <Bell className="w-4 h-4" />
            {notificationsData?.unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-sky-500 dark:bg-sky-400 rounded-full" />
            )}
          </button>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-slate-200 dark:border-slate-800">
          <div className="text-right hidden md:block">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-200">
              {user ? `${user.firstName} ${user.lastName}` : 'Guest'}
            </p>
            <p className="text-[10px] text-sky-600 dark:text-sky-400 font-mono uppercase font-semibold">
              {user?.roles?.[0] || 'Cashier'}
            </p>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-2.5 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition font-medium"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
