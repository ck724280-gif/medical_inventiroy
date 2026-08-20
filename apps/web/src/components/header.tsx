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
    <header
      className="h-16 px-6 flex items-center justify-between sticky top-0 z-30 select-none"
      style={{
        background: 'rgba(5, 10, 15, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(6, 182, 212, 0.12)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Branch Selector */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-all duration-200"
          style={{
            background: 'rgba(6, 182, 212, 0.05)',
            border: '1px solid rgba(6, 182, 212, 0.18)',
          }}
        >
          <Building2 className="w-4 h-4 text-cyan-400" />
          <span className="text-cyan-200/60 font-medium">Branch:</span>
          {branches.length > 1 ? (
            <select
              value={selectedBranchId || ''}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent font-semibold text-cyan-100 focus:outline-none cursor-pointer"
            >
              {(Array.isArray(branches) ? branches : []).map((b) => (
                <option key={b.id} value={b.id} className="bg-obsidian-900 text-slate-100">
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          ) : (
            <span className="font-semibold text-cyan-100">
              {activeBranch ? `${activeBranch.name} (${activeBranch.code})` : 'Main Branch'}
            </span>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Fullscreen Toggle for POS */}
        <button
          onClick={toggleFullscreen}
          title="Toggle Fullscreen (F11)"
          className="p-2 rounded-xl transition-all duration-200 text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/40 border border-transparent hover:border-cyan-800/40"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl relative transition-all duration-200 text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/40 border border-transparent hover:border-cyan-800/40"
          >
            <Bell className="w-4 h-4" />
            {notificationsData?.unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-cyan-400 rounded-full animate-cyan-pulse" />
            )}
          </button>
        </div>

        {/* User Info & Logout */}
        <div
          className="flex items-center gap-3 pl-3"
          style={{ borderLeft: '1px solid rgba(6, 182, 212, 0.12)' }}
        >
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-100">
              {user ? `${user.firstName} ${user.lastName}` : 'Guest'}
            </p>
            <p className="text-[10px] text-cyan-400/70 font-mono uppercase tracking-wider">
              {user?.roles?.[0] || 'User'}
            </p>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 px-2.5 py-1.5 rounded-xl transition-all duration-200 font-medium"
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.22)',
            }}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
