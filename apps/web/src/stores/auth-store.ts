import { create } from 'zustand';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  branches?: { id: string; name: string; code: string; isDefault: boolean }[];
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  selectedBranchId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, refreshToken: string, user: UserProfile) => void;
  logout: () => void;
  setSelectedBranchId: (branchId: string) => void;
  initialize: () => void;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  selectedBranchId: null,
  isAuthenticated: false,
  isLoading: true,

  initialize: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('medcare_access_token');
      const userStr = localStorage.getItem('medcare_user');
      const branchId = localStorage.getItem('medcare_branch_id');

      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          set({
            token,
            user,
            isAuthenticated: true,
            selectedBranchId: branchId || (user.branches?.[0]?.id ?? null),
            isLoading: false,
          });
          return;
        } catch (e) {
          // ignore parsing error
        }
      }
      set({ isLoading: false });
    }
  },

  login: (token, refreshToken, user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('medcare_access_token', token);
      localStorage.setItem('medcare_refresh_token', refreshToken);
      localStorage.setItem('medcare_user', JSON.stringify(user));
      const defaultBranchId = user.branches?.[0]?.id || null;
      if (defaultBranchId) {
        localStorage.setItem('medcare_branch_id', defaultBranchId);
      }
    }
    set({
      token,
      user,
      isAuthenticated: true,
      selectedBranchId: user.branches?.[0]?.id || null,
    });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('medcare_access_token');
      localStorage.removeItem('medcare_refresh_token');
      localStorage.removeItem('medcare_user');
      localStorage.removeItem('medcare_branch_id');
    }
    set({
      user: null,
      token: null,
      selectedBranchId: null,
      isAuthenticated: false,
    });
  },

  setSelectedBranchId: (branchId: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('medcare_branch_id', branchId);
    }
    set({ selectedBranchId: branchId });
  },

  hasPermission: (permission: string) => {
    const { user } = get();
    if (!user) return false;
    if (user.roles?.includes('OWNER')) return true;
    return user.permissions?.includes(permission) || false;
  },
}));
