'use client';

import { useState } from 'react';
import { AdminShell } from '@/components/admin/admin-shell';
import { Shield, Plus, Search, Edit3, Trash2, Crown, Ban, MoreHorizontal, Filter } from 'lucide-react';
import { usePermission } from '@/lib/admin/rbac/hooks';
import { cn } from '@/lib/admin/utils/cn';

type GuildData = {
  id: string;
  name: string;
  tag: string;
  game: string;
  gm: string;
  members: number;
  status: 'active' | 'inactive' | 'banned';
  rank: number;
  createdAt: string;
};

const guilds: GuildData[] = [
  { id: '1', name: 'DragonSlayers BR', tag: 'DSBR', game: 'World of Warcraft', gm: 'ValkyriePrime', members: 128, status: 'active', rank: 1, createdAt: '2023-06-15' },
  { id: '2', name: 'Eternal Guardians', tag: 'ETG', game: 'Final Fantasy XIV', gm: 'Kaelthas_BR', members: 96, status: 'active', rank: 2, createdAt: '2023-08-22' },
  { id: '3', name: 'Horde United', tag: 'HORDE', game: 'Albion Online', gm: 'DarkEclipse', members: 74, status: 'active', rank: 3, createdAt: '2024-01-10' },
  { id: '4', name: 'Lunar Eclipse', tag: 'LUNAR', game: 'Black Desert Online', gm: 'Lunaris', members: 58, status: 'inactive', rank: 4, createdAt: '2024-03-05' },
  { id: '5', name: 'Storm Legion', tag: 'STORM', game: 'Throne and Liberty', gm: 'StormBringer', members: 0, status: 'banned', rank: 0, createdAt: '2024-05-18' },
];

export default function GuildsPage() {
  const canEdit = usePermission('guilds:edit');
  const canDelete = usePermission('guilds:delete');
  const canBan = usePermission('guilds:ban');
  const [search, setSearch] = useState('');

  const filtered = guilds.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.tag.toLowerCase().includes(search.toLowerCase()),
  );

  const statusConfig = {
    active: { label: 'Ativa', class: 'bg-emerald-500/10 text-emerald-400' },
    inactive: { label: 'Inativa', class: 'bg-muted/10 text-muted' },
    banned: { label: 'Banida', class: 'bg-red-500/10 text-red-400' },
  };

  return (
    <AdminShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-white">Guildas</h1>
            <p className="text-muted text-sm mt-1">{guilds.length} guildas registradas</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={18} />
            Criar Guilda
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Buscar por nome ou tag..."
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
                  <th className="text-left text-xs font-medium text-muted uppercase px-5 py-4">Guilda</th>
                  <th className="text-left text-xs font-medium text-muted uppercase px-5 py-4">Jogo</th>
                  <th className="text-left text-xs font-medium text-muted uppercase px-5 py-4">GM</th>
                  <th className="text-left text-xs font-medium text-muted uppercase px-5 py-4">Membros</th>
                  <th className="text-left text-xs font-medium text-muted uppercase px-5 py-4">Rank</th>
                  <th className="text-left text-xs font-medium text-muted uppercase px-5 py-4">Status</th>
                  <th className="text-left text-xs font-medium text-muted uppercase px-5 py-4">Criada em</th>
                  <th className="w-24 px-5 py-4" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((guild) => (
                  <tr key={guild.id} className="border-b border-[rgba(38,51,86,0.3)] hover:bg-[rgba(109,40,217,0.04)] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                          <Shield size={16} className="text-accent" />
                        </div>
                        <div>
                          <span className="text-white text-sm font-medium">{guild.name}</span>
                          <span className="text-muted text-xs ml-2">[{guild.tag}]</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted text-sm">{guild.game}</td>
                    <td className="px-5 py-4 text-white text-sm">{guild.gm}</td>
                    <td className="px-5 py-4 text-muted text-sm">{guild.members}</td>
                    <td className="px-5 py-4 text-muted text-sm">#{guild.rank}</td>
                    <td className="px-5 py-4">
                      <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', statusConfig[guild.status].class)}>
                        {statusConfig[guild.status].label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-muted text-sm">{guild.createdAt}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        {canEdit && (
                          <button className="p-1.5 text-muted hover:text-accent transition-colors"><Edit3 size={15} /></button>
                        )}
                        {canDelete && (
                          <button className="p-1.5 text-muted hover:text-red-400 transition-colors"><Trash2 size={15} /></button>
                        )}
                        {canBan && guild.status !== 'banned' && (
                          <button className="p-1.5 text-muted hover:text-yellow-400 transition-colors"><Ban size={15} /></button>
                        )}
                        <button className="p-1.5 text-muted hover:text-white transition-colors"><MoreHorizontal size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
