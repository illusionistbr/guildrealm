'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/admin/utils/cn';
import {
  LayoutDashboard,
  Shield,
  Trophy,
  Calendar,
  User,
  Settings,
  LogOut,
  Menu,
  Bell,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  type LucideIcon,
} from 'lucide-react';

const navItems: { label: string; href: string; icon: LucideIcon }[] = [
  { label: 'Visão Geral', href: '/app/dashboard', icon: LayoutDashboard },
  { label: 'Guildas', href: '/app/guilds', icon: Shield },
  { label: 'Conquistas', href: '/app/achievements', icon: Trophy },
  { label: 'Eventos', href: '/app/events', icon: Calendar },
  { label: 'Perfil', href: '/app/profile', icon: User },
  { label: 'Configurações', href: '/app/settings', icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[#050912] flex">
      <AppSidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className={cn(
        'flex-1 flex flex-col transition-all duration-300 min-h-screen',
        sidebarOpen ? 'ml-64' : 'ml-16',
      )}>
        <AppHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-auto p-6">
          <div className="shell">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function AppSidebar({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  return (
    <aside className={cn(
      'fixed left-0 top-0 h-full bg-[#080f1e] border-r border-[rgba(38,51,86,0.5)] z-30 flex flex-col transition-all duration-300',
      open ? 'w-64' : 'w-16',
    )}>
      <div className={cn(
        'flex items-center h-16 px-4 border-b border-[rgba(38,51,86,0.5)]',
        open ? 'justify-between' : 'justify-center',
      )}>
        {open && (
          <Link href="/app/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <span className="font-heading font-bold text-white text-lg">ClanForge</span>
          </Link>
        )}
        <button
          onClick={onToggle}
          className="text-muted hover:text-white transition-colors p-1"
        >
          {open ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-2 space-y-1 scrollbar-thin">
        {navItems.map((item) => (
          <SidebarItem key={item.href} {...item} collapsed={!open} isActive={pathname === item.href} />
        ))}
      </nav>

      <div className={cn(
        'p-3 border-t border-[rgba(38,51,86,0.5)]',
        open ? 'px-4' : 'px-2',
      )}>
        <div className={cn(
          'flex items-center gap-3',
          open ? '' : 'justify-center',
        )}>
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
            <User size={16} className="text-accent" />
          </div>
          {open && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">Jogador</p>
              <p className="text-muted text-xs truncate">Nível 42 • Mago</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function SidebarItem({
  label,
  href,
  icon: Icon,
  collapsed,
  isActive,
}: { label: string; href: string; icon: LucideIcon; collapsed: boolean; isActive: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
        isActive
          ? 'bg-accent/15 text-white border border-accent/30'
          : 'text-muted hover:text-white hover:bg-[rgba(109,40,217,0.08)]',
        collapsed && 'justify-center px-2',
      )}
      title={collapsed ? label : undefined}
    >
      <Icon size={20} className={cn(isActive ? 'text-accent' : '')} />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

function AppHeader({ onMenuToggle }: { onMenuToggle: () => void }) {
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
            placeholder="Buscar guildas, jogadores..."
            className="w-72 h-9 pl-9 pr-3 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative p-2 text-muted hover:text-white transition-colors">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
        </button>

        <Link
          href="/profile/jogador"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgba(38,51,86,0.5)] text-muted text-xs hover:text-white hover:border-accent/30 transition-all"
        >
          <Eye size={14} /> Ver perfil
        </Link>

        <div className="flex items-center gap-3 pl-3 border-l border-[rgba(38,51,86,0.5)]">
          <div className="text-right">
            <p className="text-white text-sm font-medium">Jogador</p>
            <p className="text-muted text-xs">Online</p>
          </div>
          <Link
            href="/"
            className="p-2 text-muted hover:text-red-400 transition-colors"
            title="Sair"
          >
            <LogOut size={18} />
          </Link>
        </div>
      </div>
    </header>
  );
}
