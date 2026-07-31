import { create } from 'zustand';

type NavigationState = {
  menuOpen: boolean;
  toggleMenu: () => void;
  closeMenu: () => void;
};

export const useNavigationStore = create<NavigationState>((set) => ({
  menuOpen: false,
  toggleMenu: () => set((state) => ({ menuOpen: !state.menuOpen })),
  closeMenu: () => set({ menuOpen: false }),
}));
