import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  isLoading: boolean;
  notificationPanelOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setLoading: (loading: boolean) => void;
  setNotificationPanelOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  isLoading: false,
  notificationPanelOpen: false,
  toggleSidebar: () =>
    set((state) => ({
      sidebarCollapsed: !state.sidebarCollapsed,
    })),
  setSidebarCollapsed: (collapsed) =>
    set({
      sidebarCollapsed: collapsed,
    }),
  setLoading: (loading) =>
    set({
      isLoading: loading,
    }),
  setNotificationPanelOpen: (open) =>
    set({
      notificationPanelOpen: open,
    }),
}));
