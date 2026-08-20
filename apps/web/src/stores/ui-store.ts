import { create } from 'zustand';

interface UiState {
  isMobileSidebarOpen: boolean;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  openMobileSidebar: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isMobileSidebarOpen: false,
  toggleMobileSidebar: () => set((s) => ({ isMobileSidebarOpen: !s.isMobileSidebarOpen })),
  closeMobileSidebar: () => set({ isMobileSidebarOpen: false }),
  openMobileSidebar: () => set({ isMobileSidebarOpen: true }),
}));
