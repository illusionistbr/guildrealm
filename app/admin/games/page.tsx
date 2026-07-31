'use client';

import { useState } from 'react';
import { AdminShell } from '@/components/admin/admin-shell';
import { Gamepad2, Plus, Search, Edit3, Trash2, MoreHorizontal, Filter } from 'lucide-react';
import { usePermission } from '@/lib/admin/rbac/hooks';
import { cn } from '@/lib/admin/utils/cn';

const initialGames = [
  { id: '1', name: 'Throne and Liberty', slug: 'throne-and-liberty', genre: 'MMORPG • PvP & PvE', status: 'active', popularity: 98, tags: ['PvP', 'PvE', 'Open World'] },
  { id: '2', name: 'Aion 2', slug: 'aion-2', genre: 'MMORPG • Factions', status: 'active', popularity: 76, tags: ['PvP', 'Factions', 'Flight'] },
  { id: '3', name: 'World of Warcraft', slug: 'world-of-warcraft', genre: 'MMORPG', status: 'active', popularity: 100, tags: ['Raids', 'PvP', 'Mythic+'] },
  { id: '4', name: 'Final Fantasy XIV', slug: 'final-fantasy-xiv', genre: 'MMORPG', status: 'active', popularity: 85, tags: ['PvE', 'Story', 'Raids'] },
  { id: '5', name: 'Albion Online', slug: 'albion-online', genre: 'MMORPG • Sandbox', status: 'inactive', popularity: 62, tags: ['Sandbox', 'PvP', 'GvG'] },
];

export default function GamesPage() {
  const canCreate = usePermission('games:create');
  const canEdit = usePermission('games:edit');
  const canDelete = usePermission('games:delete');
  const [search, setSearch] = useState('');

  const filteredGames = initialGames.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AdminShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-white">Jogos</h1>
            <p className="text-muted text-sm mt-1">Gerencie os MMORPGs da plataforma</p>
          </div>
          {canCreate && (
            <button className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors">
              <Plus size={18} />
              Novo Jogo
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Buscar jogo..."
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
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-5 py-4">Jogo</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-5 py-4">Slug</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-5 py-4">Gênero</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-5 py-4">Popularidade</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-5 py-4">Status</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-5 py-4">Tags</th>
                  <th className="w-20 px-5 py-4" />
                </tr>
              </thead>
              <tbody>
                {filteredGames.map((game) => (
                  <tr key={game.id} className="border-b border-[rgba(38,51,86,0.3)] hover:bg-[rgba(109,40,217,0.04)] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                          <Gamepad2 size={18} className="text-accent" />
                        </div>
                        <span className="text-white text-sm font-medium">{game.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted text-sm">{game.slug}</td>
                    <td className="px-5 py-4 text-muted text-sm">{game.genre}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-[rgba(38,51,86,0.5)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-full transition-all"
                            style={{ width: `${game.popularity}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted">{game.popularity}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                        game.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-muted/10 text-muted',
                      )}>
                        {game.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1.5 flex-wrap">
                        {game.tags.map((tag) => (
                          <span key={tag} className="px-2 py-0.5 bg-[rgba(38,51,86,0.4)] rounded text-xs text-muted">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        {canEdit && (
                          <button className="p-1.5 text-muted hover:text-accent transition-colors" title="Editar">
                            <Edit3 size={15} />
                          </button>
                        )}
                        {canDelete && (
                          <button className="p-1.5 text-muted hover:text-red-400 transition-colors" title="Excluir">
                            <Trash2 size={15} />
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
          {filteredGames.length === 0 && (
            <div className="text-center py-12 text-muted">
              <Gamepad2 size={40} className="mx-auto mb-3 opacity-30" />
              <p>Nenhum jogo encontrado</p>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
