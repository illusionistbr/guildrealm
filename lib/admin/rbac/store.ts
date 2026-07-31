import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'editor' | 'support';
type Permission = string;

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

const ALL_PERMISSIONS: Permission[] = [
  'dashboard:view', 'cms:manage', 'cms:view',
  'games:create', 'games:edit', 'games:delete', 'games:view',
  'guilds:view', 'guilds:edit', 'guilds:delete', 'guilds:ban',
  'users:view', 'users:edit', 'users:delete', 'users:ban', 'users:premium',
  'achievements:manage', 'events:create', 'events:edit', 'events:delete', 'events:view',
  'marketplace:manage', 'marketplace:view', 'premium:manage', 'premium:view',
  'moderation:view', 'moderation:act', 'seo:manage', 'translations:manage',
  'notifications:send', 'notifications:manage', 'permissions:manage',
  'logs:view', 'logs:export', 'settings:view', 'settings:manage',
  'security:manage', 'analytics:view', 'finance:view', 'support:manage',
];

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

// Test admin credentials
const TEST_ADMINS: Record<string, { password: string; session: AdminSession }> = {
  'admin@guildrealm.com': {
    password: 'Admin@123',
    session: {
      uid: 'test-super-admin-001',
      email: 'admin@guildrealm.com',
      role: 'super_admin',
      permissions: ALL_PERMISSIONS,
      displayName: 'Super Admin',
      photoURL: undefined,
      mfaEnabled: false,
      mfaVerified: false,
    },
  },
  'mod@guildrealm.com': {
    password: 'Mod@123',
    session: {
      uid: 'test-moderator-001',
      email: 'mod@guildrealm.com',
      role: 'moderator',
      permissions: [
        'dashboard:view', 'cms:view', 'games:view', 'guilds:view', 'guilds:edit',
        'users:view', 'users:edit', 'events:view', 'moderation:view', 'moderation:act',
        'logs:view', 'support:manage',
      ],
      displayName: 'Moderador',
      photoURL: undefined,
      mfaEnabled: false,
      mfaVerified: false,
    },
  },
  'editor@guildrealm.com': {
    password: 'Editor@123',
    session: {
      uid: 'test-editor-001',
      email: 'editor@guildrealm.com',
      role: 'editor',
      permissions: [
        'dashboard:view', 'cms:manage', 'games:view', 'games:edit',
        'guilds:view', 'users:view', 'achievements:manage',
        'events:create', 'events:edit', 'events:view',
        'seo:manage', 'translations:manage', 'logs:view',
      ],
      displayName: 'Editor',
      photoURL: undefined,
      mfaEnabled: false,
      mfaVerified: false,
    },
  },
};

export function loginTestAdmin(email: string, password: string): AdminSession | null {
  const admin = TEST_ADMINS[email.toLowerCase().trim()];
  if (!admin || admin.password !== password) return null;

  const logs = JSON.parse(localStorage.getItem('admin_test_logs') || '[]');
  logs.push({
    id: `log_${Date.now()}`,
    user: email,
    action: 'login',
    target: 'Sessão',
    details: 'Login realizado (modo teste)',
    date: new Date().toISOString(),
    ip: '192.168.1.100',
  });
  if (logs.length > 100) logs.shift();
  localStorage.setItem('admin_test_logs', JSON.stringify(logs));

  return admin.session;
}

export function logoutTestAdmin() {
  const logs = JSON.parse(localStorage.getItem('admin_test_logs') || '[]');
  logs.push({
    id: `log_${Date.now()}`,
    user: 'current',
    action: 'logout',
    target: 'Sessão',
    details: 'Logout (modo teste)',
    date: new Date().toISOString(),
    ip: '192.168.1.100',
  });
  localStorage.setItem('admin_test_logs', JSON.stringify(logs));
}

export function getTestAuditLogs() {
  return JSON.parse(localStorage.getItem('admin_test_logs') || '[]');
}
