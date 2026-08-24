'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/admin/firebase/client';
import {
  profileNickname,
  useCurrentUserProfile,
} from '@/lib/app/use-current-user-profile';
import { cn } from '@/lib/admin/utils/cn';
import {
  LayoutDashboard,
  Shield,
  Trophy,
  User,
  Settings,
  LogOut,
  Menu,
  Bell,
  ChevronLeft,
  ChevronRight,
  Eye,
  type LucideIcon,
} from 'lucide-react';

const navItems: { label: string; href: string; icon: LucideIcon }[] = [
  { label: 'Visão Geral', href: '/app/dashboard', icon: LayoutDashboard },
  { label: 'Conquistas', href: '/app/achievements', icon: Trophy },
  { label: 'Perfil', href: '/app/profile', icon: User },
  { label: 'Configurações', href: '/app/settings', icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();
  const isGuildsPage = pathname === '/app/guilds' || pathname?.startsWith('/app/guilds/');

  return (
    <div className="min-h-screen bg-[#050912] flex">
      <AppSidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className={cn(
        'flex-1 flex flex-col transition-all duration-300 min-h-screen',
        sidebarOpen ? 'ml-64' : 'ml-16',
      )}>
        <AppHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className={cn('flex-1 overflow-auto', isGuildsPage ? 'p-0' : 'p-6')}>
          {isGuildsPage ? children : <div className="shell">{children}</div>}
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
            <img src="/images/clanforge-logo.png" alt="ClanForge" width={120} height={32} className="h-7 w-auto object-contain" />
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

      <SidebarUser open={open} />
    </aside>
  );
}

function SidebarUser({ open }: { open: boolean }) {
  const { fbUser, profile, loading } = useCurrentUserProfile();
  const nickname = profileNickname(profile);

  if (loading || !fbUser) {
    return (
      <div className={cn('p-3 border-t border-[rgba(38,51,86,0.5)]', open ? 'px-4' : 'px-2')}>
        <div className={cn('flex items-center gap-3', !open && 'justify-center')}>
          <div className="w-8 h-8 rounded-full bg-accent/20 animate-pulse shrink-0" />
          {open && (
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-20 rounded bg-[rgba(38,51,86,0.4)] animate-pulse" />
              <div className="h-2.5 w-14 rounded bg-[rgba(38,51,86,0.3)] animate-pulse" />
            </div>
          )}
        </div>
      </div>
    );
  }

  const name =
    profile?.displayName?.trim() ||
    fbUser.displayName?.trim() ||
    fbUser.email?.split('@')[0] ||
    'Usuário';

  return (
    <div className={cn('p-3 border-t border-[rgba(38,51,86,0.5)]', open ? 'px-4' : 'px-2')}>
      <div className={cn(
        'flex items-center gap-3',
        open ? '' : 'justify-center',
      )}>
        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden shrink-0">
          {(profile?.photoURL || fbUser.photoURL) ? (
            <img
              src={(profile?.photoURL ?? fbUser.photoURL)!}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <User size={16} className="text-accent" />
          )}
        </div>
        {open && (
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{name}</p>
            {nickname && (
              <p className="text-muted text-xs truncate">@{nickname}</p>
            )}
          </div>
        )}
      </div>
    </div>
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
  const router = useRouter();
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);
  const { fbUser, profile, loading } = useCurrentUserProfile();
  const nickname = profileNickname(profile);
  const isGuildsActive = pathname === '/app/guilds' || pathname.startsWith('/app/guilds/');

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut(getFirebaseAuth());
      router.replace('/login');
    } catch {
      setSigningOut(false);
    }
  };

  const name =
    profile?.displayName?.trim() ||
    fbUser?.displayName?.trim() ||
    fbUser?.email?.split('@')[0] ||
    '';

  return (
    <header className="h-16 border-b border-[rgba(38,51,86,0.5)] bg-[#080f1e]/80 backdrop-blur-md flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="text-muted hover:text-white transition-colors p-1"
        >
          <Menu size={20} />
        </button>

        <Link
          href="/app/guilds"
          className={cn(
            'hidden md:flex items-center gap-2 h-9 px-4 rounded-lg border text-sm font-medium transition-all',
            isGuildsActive
              ? 'bg-accent/15 text-white border-accent/30'
              : 'text-muted hover:text-white hover:bg-[rgba(109,40,217,0.08)] border-transparent hover:border-[rgba(38,51,86,0.5)]',
          )}
        >
          <Shield size={16} className={isGuildsActive ? 'text-accent' : ''} /> Guildas
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative p-2 text-muted hover:text-white transition-colors">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
        </button>

        {!loading && nickname && (
          <Link
            href={`/profile/${nickname}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgba(38,51,86,0.5)] text-muted text-xs hover:text-white hover:border-accent/30 transition-all"
          >
            <Eye size={14} /> Ver perfil
          </Link>
        )}

        <div className="flex items-center gap-3 pl-3 border-l border-[rgba(38,51,86,0.5)]">
          {loading ? (
            <div className="space-y-1.5 text-right">
              <div className="h-3 w-20 rounded bg-[rgba(38,51,86,0.4)] animate-pulse ml-auto" />
              <div className="h-2.5 w-12 rounded bg-[rgba(38,51,86,0.3)] animate-pulse ml-auto" />
            </div>
          ) : (
            <div className="text-right max-w-[160px]">
              <p className="text-white text-sm font-medium truncate">{name}</p>
              {nickname && (
                <p className="text-muted text-xs truncate">@{nickname}</p>
              )}
            </div>
          )}
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            title={signingOut ? 'Saindo...' : 'Sair'}
            className="p-2 text-muted hover:text-red-400 transition-colors disabled:opacity-50"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
