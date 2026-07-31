'use client';

import { useAuthStore } from './store';
import type { Permission, AdminRole } from './roles';

export function usePermission(permission: Permission): boolean {
  return useAuthStore((state) => state.hasPermission(permission));
}

export function useRole(role: AdminRole): boolean {
  return useAuthStore((state) => state.hasRole(role));
}

export function useCanAccess(...permissions: Permission[]): boolean {
  const { session } = useAuthStore();
  if (!session) return false;
  if (session.role === 'super_admin') return true;
  return permissions.some((p) => session.permissions.includes(p));
}

export function useRoleGuard(allowedRoles: AdminRole[]): boolean {
  const { session } = useAuthStore();
  if (!session) return false;
  return allowedRoles.includes(session.role) || session.role === 'super_admin';
}
