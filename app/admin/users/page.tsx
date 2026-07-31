'use client';

import { useState } from 'react';
import { AdminShell } from '@/components/admin/admin-shell';
import { Users, Search, Edit3, Ban, Crown, MoreHorizontal, UserPlus, Filter, Shield, XCircle } from 'lucide-react';
import { usePermission } from '@/lib/admin/rbac/hooks';
import { cn } from '@/lib/admin/utils/cn';

type UserStatus = 'active' | 'suspended' | 'banned';

type UserData = {
  id: string;
  nickname: string;
  email: string;
  status: UserStatus;
  premium: boolean;
  xp: number;
  guilds: number;
  createdAt: string;
  lastLogin: string;
};

const users: UserData[] = [
  { id: '1', nickname: 'ValkyriePrime', email: 'valkyrie@email.com', status: 'active', premium: true, xp: 45200, guilds: 2, createdAt: '2024-01-15', lastLogin: '2min atrás' },
  { id: '2', nickname: 'DarkEclipse', email: 'dark@email.com', status: 'active', premium: false, xp: 23100, guilds: 1, createdAt: '2024-03-22', lastLogin: '1h atrás' },
  { id: '3', nickname: 'Kaelthas_BR', email: 'kael@email.com', status: 'suspended', premium: false, xp: 8900, guilds: 1, createdAt: '2024-06-10', lastLogin: '2d atrás' },
  { id: '4', nickname: 'Lunaris', email: 'luna@email.com', status: 'active', premium: true, xp: 67800, guilds: 3, createdAt: '2023-11-05', lastLogin: '5min atrás' },
  { id: '5', nickname: 'StormBringer', email: 'storm@email.com', status: 'banned', premium: false, xp: 3200, guilds: 0, createdAt: '2024-08-18', lastLogin: '15d atrás' },
];

export default function UsersPage() {
  const canEdit = usePermission('users:edit');
  const canBan = usePermission('users:ban');
  const canPremium = usePermission('users:premium');
  const [search, setSearch] = useState('');

  const filteredUsers = users.filter((u) =>
    u.nickname.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const statusConfig: Record<UserStatus, { label: string; class: string }> = {
    active: { label: 'Ativo', class: 'bg-emerald-500/10 text-emerald-400' },
    suspended: { label: 'Suspenso', class: 'bg-yellow-500/10 text-yellow-400' },
    banned: { label: 'Banido', class: 'bg-red-500/10 text-red-400' },
  };

  return (
    <AdminShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-white">Usuários</h1>
            <p className="text-muted text-sm mt-1">{users.length} usuários cadastrados</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors">
            <UserPlus size={18} />
            Novo Usuário
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Buscar por nickname ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-4 bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-lg text-muted hover:text-white text-sm transition-colors">
            <Filter size={16} />
            Filtros
          </button>
        </div>

        <div className="bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(38,51,86,0.5)]">
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-5 py-4">Usuário</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-5 py-4">E-mail</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-5 py-4">Status</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-5 py-4">XP</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-5 py-4">Guildas</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-5 py-4">Premium</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-5 py-4">Registro</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-5 py-4">Último Login</th>
                  <th className="w-24 px-5 py-4" />
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-[rgba(38,51,86,0.3)] hover:bg-[rgba(109,40,217,0.04)] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
                          <Users size={16} className="text-accent" />
                        </div>
                        <span className="text-white text-sm font-medium">{user.nickname}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted text-sm">{user.email}</td>
                    <td className="px-5 py-4">
                      <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', statusConfig[user.status].class)}>
                        {statusConfig[user.status].label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-white text-sm font-mono">{user.xp.toLocaleString()}</td>
                    <td className="px-5 py-4 text-muted text-sm">{user.guilds}</td>
                    <td className="px-5 py-4">
                      {user.premium ? (
                        <Crown size={16} className="text-yellow-400" />
                      ) : (
                        <span className="text-muted text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-muted text-sm">{user.createdAt}</td>
                    <td className="px-5 py-4 text-muted text-sm">{user.lastLogin}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        {canEdit && (
                          <button className="p-1.5 text-muted hover:text-accent transition-colors" title="Editar">
                            <Edit3 size={15} />
                          </button>
                        )}
                        {canBan && user.status === 'active' && (
                          <button className="p-1.5 text-muted hover:text-yellow-400 transition-colors" title="Suspender">
                            <Ban size={15} />
                          </button>
                        )}
                        {canBan && user.status !== 'banned' && (
                          <button className="p-1.5 text-muted hover:text-red-400 transition-colors" title="Banir">
                            <XCircle size={15} />
                          </button>
                        )}
                        <button className="p-1.5 text-muted hover:text-white transition-colors">
                          <MoreHorizontal size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredUsers.length === 0 && (
            <div className="text-center py-12 text-muted">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p>Nenhum usuário encontrado</p>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
