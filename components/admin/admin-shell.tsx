'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, logoutTestAdmin } from '@/lib/admin/rbac/store';
import { Sidebar } from './sidebar';
import { AdminHeader } from './admin-header';
import { cn } from '@/lib/admin/utils/cn';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const hydrated = useAuthStore((s) => s._hydrated);

  useEffect(() => {
    if (!hydrated) return; // Wait for zustand persist to rehydrate

    if (!session) {
      router.push('/admin/login');
    }
  }, [hydrated, session, router]);

  if (!hydrated || !session) {
    return (
      <div className="min-h-screen bg-[#050912] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted text-sm">Carregando painel...</p>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logoutTestAdmin();
    document.cookie = 'admin_session=; path=/admin; max-age=0';
    useAuthStore.getState().clearSession();
    router.push('/admin/login');
  };

  return (
    <div className="min-h-screen bg-[#050912] flex">
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className={cn(
        'flex-1 flex flex-col transition-all duration-300',
        sidebarOpen ? 'ml-64' : 'ml-16',
      )}>
        <AdminHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} onLogout={handleLogout} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
