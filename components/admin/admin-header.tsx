'use client';

import { Menu, LogOut, Bell, Search } from 'lucide-react';
import { useAuthStore } from '@/lib/admin/rbac/store';

export function AdminHeader({
  onMenuToggle,
  onLogout,
}: {
  onMenuToggle: () => void;
  onLogout: () => void;
}) {
  const { session } = useAuthStore();

  return (
    <header className="h-16 border-b border-[rgba(38,51,86,0.5)] bg-[#080f1e]/80 backdrop-blur-md flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="text-muted hover:text-white transition-colors p-1"
        >
          <Menu size={20} />
        </button>

        <div className="relative hidden md:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Pesquisar no admin..."
            className="w-72 h-9 pl-9 pr-3 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative p-2 text-muted hover:text-white transition-colors">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
        </button>

        <div className="flex items-center gap-3 pl-3 border-l border-[rgba(38,51,86,0.5)]">
          <div className="text-right">
            <p className="text-white text-sm font-medium">{session?.displayName ?? session?.email}</p>
            <p className="text-muted text-xs capitalize">{session?.role?.replace('_', ' ')}</p>
          </div>
          <button
            onClick={onLogout}
            className="p-2 text-muted hover:text-red-400 transition-colors"
            title="Sair"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
