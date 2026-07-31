'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/admin/utils/cn';
import { useAuthStore } from '@/lib/admin/rbac/store';
import { usePermission } from '@/lib/admin/rbac/hooks';
import type { Permission } from '@/lib/admin/rbac/roles';
import {
  LayoutDashboard,
  FileText,
  Gamepad2,
  Shield,
  Users,
  Trophy,
  Calendar,
  ShoppingBag,
  Crown,
  Flag,
  Search,
  Globe,
  Bell,
  ShieldCheck,
  Settings,
  ClipboardList,
  Server,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
};

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Principal',
    items: [
      { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, permission: 'dashboard:view' },
    ],
  },
  {
    title: 'Gerenciamento',
    items: [
      { label: 'CMS', href: '/admin/cms', icon: FileText, permission: 'cms:view' },
      { label: 'Jogos', href: '/admin/games', icon: Gamepad2, permission: 'games:view' },
      { label: 'Guildas', href: '/admin/guilds', icon: Shield, permission: 'guilds:view' },
      { label: 'Usuários', href: '/admin/users', icon: Users, permission: 'users:view' },
      { label: 'Conquistas', href: '/admin/achievements', icon: Trophy, permission: 'achievements:manage' },
      { label: 'Eventos', href: '/admin/events', icon: Calendar, permission: 'events:view' },
    ],
  },
  {
    title: 'Negócios',
    items: [
      { label: 'Marketplace', href: '/admin/marketplace', icon: ShoppingBag, permission: 'marketplace:view' },
      { label: 'Premium', href: '/admin/premium', icon: Crown, permission: 'premium:view' },
      { label: 'SEO', href: '/admin/seo', icon: Search, permission: 'seo:manage' },
      { label: 'Traduções', href: '/admin/translations', icon: Globe, permission: 'translations:manage' },
    ],
  },
  {
    title: 'Comunidade',
    items: [
      { label: 'Moderação', href: '/admin/moderation', icon: Flag, permission: 'moderation:view' },
      { label: 'Notificações', href: '/admin/notifications', icon: Bell, permission: 'notifications:manage' },
    ],
  },
  {
    title: 'Administração',
    items: [
      { label: 'Permissões', href: '/admin/permissions', icon: ShieldCheck, permission: 'permissions:manage' },
      { label: 'Logs', href: '/admin/logs', icon: ClipboardList, permission: 'logs:view' },
      { label: 'Configurações', href: '/admin/settings', icon: Settings, permission: 'settings:view' },
      { label: 'Sistema', href: '/admin/system', icon: Server, permission: 'security:manage' },
    ],
  },
];

export function Sidebar({ open, onToggle }: { open: boolean; onToggle: () => void }) {
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
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-accent" />
            <span className="font-heading font-bold text-white text-lg">GuildRealm</span>
          </Link>
        )}
        <button
          onClick={onToggle}
          className="text-muted hover:text-white transition-colors p-1"
        >
          {open ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6 scrollbar-thin">
        {navSections.map((section) => (
          <div key={section.title}>
            {open && (
              <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-muted mb-2">
                {section.title}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => (
                <SidebarItem
                  key={item.href}
                  {...item}
                  isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                  collapsed={!open}
                />
              ))}
            </div>
          </div>
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
            <Users size={16} className="text-accent" />
          </div>
          {open && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">Admin</p>
              <p className="text-muted text-xs truncate">Super Admin</p>
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
  isActive,
  collapsed,
}: NavItem & { isActive: boolean; collapsed: boolean }) {
  const hasAccess = true; // Will be filtered by parent

  if (!hasAccess) return null;

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
