'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Building2,
  LogOut,
  Maximize2,
  User as UserIcon,
  ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '../stores/auth-store';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export function Header() {
  const router = useRouter();
  const { user, selectedBranchId, setSelectedBranchId, logout } = useAuthStore();
  const [showNotifications, setShowNotifications] = useState(false);

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const res = await apiClient.get('/notifications/unread-count');
      return res.data;
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  const branches = user?.branches || [];
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
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Branch Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
          <Building2 className="w-4 h-4 text-sky-600" />
          <span className="text-slate-500 font-medium">Branch:</span>
          {branches.length > 1 ? (
            <select
              value={selectedBranchId || ''}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          ) : (
            <span className="font-semibold text-slate-800">
              {activeBranch ? `${activeBranch.name} (${activeBranch.code})` : 'Main Branch'}
            </span>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Fullscreen Toggle for POS */}
        <button
          onClick={toggleFullscreen}
          title="Toggle Fullscreen (F11)"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg relative transition"
          >
            <Bell className="w-4 h-4" />
            {notificationsData?.unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-800">
              {user ? `${user.firstName} ${user.lastName}` : 'Guest'}
            </p>
            <p className="text-[10px] text-slate-500 font-mono">
              {user?.roles?.[0] || 'User'}
            </p>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-200 transition font-medium"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
