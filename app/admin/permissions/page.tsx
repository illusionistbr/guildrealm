'use client';

import { useState } from 'react';
import { AdminShell } from '@/components/admin/admin-shell';
import { ShieldCheck, Users, Edit3, Search } from 'lucide-react';
import { cn } from '@/lib/admin/utils/cn';
import { ROLE_PERMISSIONS, type AdminRole, type Permission } from '@/lib/admin/rbac/roles';

const roleLabels: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  moderator: 'Moderador',
  editor: 'Editor',
  support: 'Suporte',
};

const permissionLabels: Record<Permission, string> = {
  'dashboard:view': 'Ver Dashboard',
  'cms:manage': 'Gerenciar CMS',
  'cms:view': 'Ver CMS',
  'games:create': 'Criar Jogos',
  'games:edit': 'Editar Jogos',
  'games:delete': 'Excluir Jogos',
  'games:view': 'Ver Jogos',
  'guilds:view': 'Ver Guildas',
  'guilds:edit': 'Editar Guildas',
  'guilds:delete': 'Excluir Guildas',
  'guilds:ban': 'Banir Guildas',
  'users:view': 'Ver Usuários',
  'users:edit': 'Editar Usuários',
  'users:delete': 'Excluir Usuários',
  'users:ban': 'Banir Usuários',
  'users:premium': 'Gerenciar Premium',
  'achievements:manage': 'Gerenciar Conquistas',
  'events:create': 'Criar Eventos',
  'events:edit': 'Editar Eventos',
  'events:delete': 'Excluir Eventos',
  'events:view': 'Ver Eventos',
  'marketplace:manage': 'Gerenciar Marketplace',
  'marketplace:view': 'Ver Marketplace',
  'premium:manage': 'Gerenciar Premium',
  'premium:view': 'Ver Premium',
  'moderation:view': 'Ver Moderação',
  'moderation:act': 'Agir na Moderação',
  'seo:manage': 'Gerenciar SEO',
  'translations:manage': 'Gerenciar Traduções',
  'notifications:send': 'Enviar Notificações',
  'notifications:manage': 'Gerenciar Notificações',
  'permissions:manage': 'Gerenciar Permissões',
  'logs:view': 'Ver Logs',
  'logs:export': 'Exportar Logs',
  'settings:view': 'Ver Configurações',
  'settings:manage': 'Gerenciar Configurações',
  'security:manage': 'Gerenciar Segurança',
  'analytics:view': 'Ver Analytics',
  'finance:view': 'Ver Financeiro',
  'support:manage': 'Gerenciar Suporte',
};

const allPermissions = Object.keys(permissionLabels) as Permission[];

export default function PermissionsPage() {
  const [selectedRole, setSelectedRole] = useState<AdminRole>('editor');

  return (
    <AdminShell>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">Permissões</h1>
          <p className="text-muted text-sm mt-1">Gerencie permissões por função (RBAC)</p>
        </div>

        <div className="flex gap-2">
          {(Object.keys(roleLabels) as AdminRole[]).map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                selectedRole === role
                  ? 'bg-accent text-white'
                  : 'bg-[#0a1122] border border-[rgba(38,51,86,0.7)] text-muted hover:text-white',
              )}
            >
              {roleLabels[role]}
            </button>
          ))}
        </div>

        <div className="bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-xl overflow-hidden">
          <div className="p-5 border-b border-[rgba(38,51,86,0.5)]">
            <h3 className="text-white font-heading font-bold text-base">
              Permissões: {roleLabels[selectedRole]}
            </h3>
            <p className="text-xs text-muted mt-1">
              {ROLE_PERMISSIONS[selectedRole].length} de {allPermissions.length} permissões concedidas
            </p>
          </div>
          <div className="divide-y divide-[rgba(38,51,86,0.3)]">
            {allPermissions.map((permission) => {
              const isGranted = ROLE_PERMISSIONS[selectedRole].includes(permission);
              return (
                <label
                  key={permission}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-[rgba(109,40,217,0.04)] cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isGranted}
                    readOnly
                    className="w-4 h-4 rounded border-muted bg-[#050912] text-accent focus:ring-accent"
                  />
                  <div className="flex-1">
                    <span className="text-white text-sm">{permissionLabels[permission]}</span>
                    <span className="text-xs text-muted ml-2 font-mono">({permission})</span>
                  </div>
                  <span className={cn('text-xs font-medium', isGranted ? 'text-emerald-400' : 'text-muted')}>
                    {isGranted ? 'Concedido' : 'Negado'}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
