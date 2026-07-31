import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AdminRole, Permission } from './roles';

type AdminSession = {
  uid: string;
  email: string;
  role: AdminRole;
  permissions: Permission[];
  displayName?: string;
  photoURL?: string;
  mfaEnabled: boolean;
  mfaVerified: boolean;
};

type AuthState = {
  session: AdminSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  _hydrated: boolean;
  setSession: (session: AdminSession | null) => void;
  setLoading: (loading: boolean) => void;
  setHydrated: (v: boolean) => void;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: AdminRole) => boolean;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      isLoading: true,
      isAuthenticated: false,
      _hydrated: false,
      setSession: (session) => set({ session, isAuthenticated: !!session, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      setHydrated: (v) => set({ _hydrated: v }),
      hasPermission: (permission) => {
        const { session } = get();
        if (!session) return false;
        if (session.role === 'super_admin') return true;
        return session.permissions.includes(permission);
      },
      hasRole: (role) => {
        const { session } = get();
        if (!session) return false;
        if (session.role === 'super_admin') return true;
        const hierarchy: Record<AdminRole, number> = {
          super_admin: 5, admin: 4, moderator: 3, editor: 2, support: 1,
        };
        return hierarchy[session.role] >= hierarchy[role];
      },
      clearSession: () => set({ session: null, isAuthenticated: false, isLoading: false }),
    }),
    {
      name: 'guildrealm-admin-auth',
      partialize: (state) => ({ session: state.session }),
      onRehydrateStorage: () => (state) => {
        if (state) state.setHydrated(true);
      },
    },
  ),
);

export function buildAdminSession(params: {
  uid: string;
  email: string;
  role: AdminRole;
  permissions: Permission[];
  displayName?: string;
  photoURL?: string;
}): AdminSession {
  return {
    uid: params.uid,
    email: params.email,
    role: params.role,
    permissions: params.permissions,
    displayName: params.displayName,
    photoURL: params.photoURL,
    mfaEnabled: false,
    mfaVerified: false,
  };
}
