import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { getAdminAuth } from '@/lib/admin/firebase/admin';
import type { AdminRole } from '@/lib/admin/rbac/roles';

export const runtime = 'nodejs';

const ADMIN_ROLES: AdminRole[] = ['super_admin', 'admin', 'moderator', 'editor', 'support'];

/**
 * Guard server-side de TODAS as páginas do painel admin.
 * Verifica o session cookie httpOnly (assinado pelo Admin SDK) + claim
 * de cargo a cada navegação. Sem sessão válida, volta ao login.
 * O middleware faz só a triagem rápida (presença do cookie).
 */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session')?.value;

  let authorized = false;
  if (session) {
    try {
      const decoded = await getAdminAuth().verifySessionCookie(session, true);
      const role = (decoded as { role?: AdminRole }).role;
      authorized = !!role && ADMIN_ROLES.includes(role);
    } catch {
      authorized = false;
    }
  }

  if (!authorized) {
    const pathname = (await headers()).get('x-pathname') ?? '/admin/dashboard';
    redirect(`/admin/login?redirect=${encodeURIComponent(pathname)}`);
  }

  return <>{children}</>;
}
