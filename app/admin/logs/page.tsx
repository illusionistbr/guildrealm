'use client';

import { useState } from 'react';
import { AdminShell } from '@/components/admin/admin-shell';
import { ClipboardList, Search, Filter, Download, Clock, ShieldCheck, UserPlus, Edit3, Trash2, LogIn, LogOut } from 'lucide-react';
import { cn } from '@/lib/admin/utils/cn';

const actionIcons: Record<string, any> = {
  login: LogIn,
  logout: LogOut,
  create: UserPlus,
  update: Edit3,
  delete: Trash2,
};

const allLogs = [
  { id: '1', user: 'admin@clanforge.com', action: 'login', target: 'Sessão', details: 'Login realizado', date: '2min atrás', ip: '189.45.67.89' },
  { id: '2', user: 'admin@clanforge.com', action: 'update', target: 'Jogo: Throne and Liberty', details: 'Descrição alterada', date: '15min atrás', ip: '189.45.67.89' },
  { id: '3', user: 'editor@clanforge.com', action: 'create', target: 'Conquista: Lenda Viva', details: 'Nova conquista criada', date: '1h atrás', ip: '191.23.45.67' },
  { id: '4', user: 'mod@clanforge.com', action: 'update', target: 'Usuário: DarkEclipse', details: 'Status alterado para suspenso', date: '2h atrás', ip: '177.89.01.23' },
  { id: '5', user: 'admin@clanforge.com', action: 'delete', target: 'Guilda: Storm Legion', details: 'Guilda banida', date: '3h atrás', ip: '189.45.67.89' },
  { id: '6', user: 'editor@clanforge.com', action: 'update', target: 'CMS: Hero Section', details: 'Título atualizado', date: '5h atrás', ip: '191.23.45.67' },
  { id: '7', user: 'admin@clanforge.com', action: 'logout', target: 'Sessão', details: 'Logout', date: '8h atrás', ip: '189.45.67.89' },
];

export default function LogsPage() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const filtered = allLogs.filter((log) => {
    const matchesSearch = log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.target.toLowerCase().includes(search.toLowerCase());
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  return (
    <AdminShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-white">Logs</h1>
            <p className="text-muted text-sm mt-1">Registro completo de ações do painel</p>
          </div>
          <button className="flex items-center gap-2 px-3 py-2 bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-lg text-muted hover:text-white text-sm transition-colors">
            <Download size={16} />
            Exportar
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Buscar logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-4 bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50"
            />
          </div>
          <div className="flex gap-1">
            {['all', 'login', 'logout', 'create', 'update', 'delete'].map((action) => (
              <button
                key={action}
                onClick={() => setActionFilter(action)}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm transition-colors capitalize',
                  actionFilter === action
                    ? 'bg-accent text-white'
                    : 'text-muted hover:text-white',
                )}
              >
                {action === 'all' ? 'Todos' : action}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-xl overflow-hidden">
          <div className="divide-y divide-[rgba(38,51,86,0.3)]">
            {filtered.map((log) => {
              const Icon = actionIcons[log.action] || ClipboardList;
              return (
                <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-[rgba(109,40,217,0.04)] transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon size={16} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium">{log.user}</span>
                      <span className="text-xs text-muted capitalize">— {log.action}</span>
                    </div>
                    <p className="text-sm text-muted mt-0.5">{log.target}</p>
                    <p className="text-xs text-muted mt-0.5">{log.details}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted">{log.date}</p>
                    <p className="text-xs text-muted font-mono">{log.ip}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted">
              <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
              <p>Nenhum log encontrado</p>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
