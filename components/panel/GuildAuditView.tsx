'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/admin/firebase/client';
import { cn } from '@/lib/admin/utils/cn';
import {
  Ban,
  CalendarDays,
  Clock,
  Filter,
  Search,
  Shield,
  UserMinus,
  UserPlus,
  FileSearch,
  ArrowUpDown,
  ShieldOff,
  Loader2,
  X,
} from 'lucide-react';

type ActivityEntry = {
  id: string;
  type: 'join' | 'leave' | 'kick' | 'ban' | 'rank_change' | 'status_change';
  userId: string;
  characterId: string;
  characterName: string;
  details?: Record<string, unknown>;
  createdAt?: { seconds: number; nanoseconds?: number; toDate?: () => Date } | Date;
};

const typeLabels: Record<string, string> = {
  all: 'Todos os tipos',
  join: 'Entrada',
  leave: 'Saída',
  kick: 'Expulsão',
  ban: 'Banimento',
  rank_change: 'Alteração de cargo',
  status_change: 'Ativar/Inativar',
};

const typeOptions: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'join', label: 'Entrada' },
  { value: 'leave', label: 'Saída' },
  { value: 'kick', label: 'Expulsão' },
  { value: 'ban', label: 'Banimento' },
  { value: 'rank_change', label: 'Alteração de cargo' },
  { value: 'status_change', label: 'Ativar/Inativar' },
];

const iconForType: Record<string, React.ElementType> = {
  join: UserPlus,
  leave: UserMinus,
  kick: ShieldOff,
  ban: Ban,
  rank_change: ArrowUpDown,
  status_change: Shield,
};

const colorForType: Record<string, string> = {
  join: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  leave: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  kick: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  ban: 'text-red-400 bg-red-500/10 border-red-500/20',
  rank_change: 'text-accent bg-accent/10 border-accent/20',
  status_change: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
};

function toDate(ts: ActivityEntry['createdAt']): Date | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof (ts as { toDate?: () => Date }).toDate === 'function') return (ts as { toDate: () => Date }).toDate();
  if (typeof (ts as { seconds: number }).seconds === 'number') return new Date((ts as { seconds: number }).seconds * 1000);
  return null;
}

function formatDateTime(date: Date | null): string {
  if (!date) return '—';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function GuildAuditView({
  guildId,
  guild,
  memberNames,
}: {
  guildId: string;
  guild: { name?: string } | null;
  memberNames: Record<string, string>;
}) {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actorNames, setActorNames] = useState<Record<string, string>>({});
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [limitCount, setLimitCount] = useState(50);

  useEffect(() => {
    if (!guildId) return;
    const q = query(
      collection(getFirebaseDb(), 'guilds', guildId, 'activity'),
      orderBy('createdAt', 'desc'),
      limit(200),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ActivityEntry);
        setActivities(items);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [guildId]);

  // Resolve actor display names (userId -> displayName)
  useEffect(() => {
    const needed = [...new Set(activities.map((a) => a.userId).filter(Boolean))].filter(
      (uid) => !actorNames[uid] && !memberNames[uid],
    );
    if (needed.length === 0) return;
    let disposed = false;
    const load = async () => {
      const names: Record<string, string> = {};
      await Promise.all(
        needed.map(async (uid) => {
          try {
            const snap = await getDoc(doc(getFirebaseDb(), 'users', uid));
            if (snap.exists()) {
              const data = snap.data() as { displayName?: string; nickname?: string };
              names[uid] = data.displayName?.trim() || data.nickname || uid.slice(0, 8);
            }
          } catch {}
        }),
      );
      if (!disposed && Object.keys(names).length) setActorNames((prev) => ({ ...prev, ...names }));
    };
    load();
    return () => {
      disposed = true;
    };
  }, [activities, actorNames, memberNames]);

  const filtered = useMemo(() => {
    const userQ = userFilter.trim().toLowerCase();
    const fromTs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTs = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;

    return activities.filter((a) => {
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;

      if (userQ) {
        const actorName = (actorNames[a.userId] ?? memberNames[a.userId] ?? '').toLowerCase();
        const targetName = (a.characterName ?? '').toLowerCase();
        const detailRank = String(a.details?.rankName ?? '').toLowerCase();
        if (!actorName.includes(userQ) && !targetName.includes(userQ) && !detailRank.includes(userQ)) return false;
      }

      const d = toDate(a.createdAt);
      if (d) {
        const ts = d.getTime();
        if (fromTs !== null && ts < fromTs) return false;
        if (toTs !== null && ts > toTs) return false;
      }

      return true;
    });
  }, [activities, typeFilter, userFilter, dateFrom, dateTo, actorNames, memberNames]);

  const visible = filtered.slice(0, limitCount);
  const hasMore = filtered.length > limitCount;

  const clearFilters = () => {
    setTypeFilter('all');
    setUserFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const describe = (a: ActivityEntry) => {
    const actor = actorNames[a.userId] ?? memberNames[a.userId] ?? a.userId.slice(0, 8);
    const target = a.characterName || '—';
    switch (a.type) {
      case 'join':
        return (
          <>
            <span className="text-white font-medium">{actor}</span>
            <span className="text-muted"> adicionou </span>
            <span className="text-white font-medium">{target}</span>
            <span className="text-muted"> à guild</span>
            {a.details && (a.details as { via?: string }).via === 'application' && (
              <span className="text-muted"> (via candidatura)</span>
            )}
          </>
        );
      case 'leave':
        return (
          <>
            <span className="text-white font-medium">{target}</span>
            <span className="text-muted"> saiu da guild</span>
            <span className="text-muted"> (ação de {actor})</span>
          </>
        );
      case 'kick': {
        const by = actor;
        return (
          <>
            <span className="text-orange-300 font-medium">{by}</span>
            <span className="text-muted"> expulsou </span>
            <span className="text-white font-medium">{target}</span>
          </>
        );
      }
      case 'ban': {
        const by = actor;
        return (
          <>
            <span className="text-red-400 font-medium">{by}</span>
            <span className="text-muted"> baniu </span>
            <span className="text-white font-medium">{target}</span>
          </>
        );
      }
      case 'rank_change': {
        const by = actor;
        const rankName = (a.details?.rankName as string) ?? (a.details?.rankId as string) ?? 'cargo';
        return (
          <>
            <span className="text-white font-medium">{by}</span>
            <span className="text-muted"> alterou cargo de </span>
            <span className="text-white font-medium">{target}</span>
            <span className="text-muted"> para </span>
            <span className="text-accent font-medium">{rankName}</span>
          </>
        );
      }
      case 'status_change': {
        const by = actor;
        const inactive = Boolean(a.details?.inactive);
        return (
          <>
            <span className="text-white font-medium">{by}</span>
            <span className="text-muted"> {inactive ? 'inativou' : 'reativou'} </span>
            <span className="text-white font-medium">{target}</span>
          </>
        );
      }
      default:
        return (
          <>
            <span className="text-white">{actor}</span>
            <span className="text-muted"> — </span>
            <span className="text-white">{target}</span>
            <span className="text-muted"> ({a.type})</span>
          </>
        );
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileSearch size={18} className="text-accent" />
          <h3 className="text-white font-heading font-semibold">Auditoria</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-[#0a1122] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + filtros */}
      <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileSearch size={18} className="text-accent" />
          <h3 className="text-white font-heading font-semibold">Auditoria da Guild</h3>
          <span className="ml-auto text-xs text-muted">
            {filtered.length} registro{filtered.length !== 1 ? 's' : ''} • {activities.length} no total
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold tracking-wider text-muted uppercase">Tipo de ação</span>
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full h-10 pl-3 pr-8 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white focus:outline-none focus:border-accent/50 appearance-none"
              >
                {typeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#0a1122]">
                    {opt.label}
                  </option>
                ))}
              </select>
              <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold tracking-wider text-muted uppercase">Usuário / Alvo</span>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Ex: Phantom, Daryl..."
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="w-full h-10 pl-9 pr-3 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold tracking-wider text-muted uppercase">De</span>
            <div className="relative">
              <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full h-10 pl-9 pr-3 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white focus:outline-none focus:border-accent/50"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold tracking-wider text-muted uppercase">Até</span>
            <div className="relative">
              <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full h-10 pl-9 pr-3 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white focus:outline-none focus:border-accent/50"
              />
            </div>
          </label>
        </div>

        {(typeFilter !== 'all' || userFilter || dateFrom || dateTo) && (
          <button onClick={clearFilters} className="mt-3 inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover transition-colors">
            <X size={12} /> Limpar filtros
          </button>
        )}

        <p className="mt-3 text-[11px] text-muted/70">
          Sem dados pessoais: apenas nome público, data/hora e ação. Exemplo: “Oficial Phantom baniu membro Daryl”.
        </p>
      </div>

      {/* Lista */}
      <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-10 px-6">
            <FileSearch size={28} className="mx-auto text-muted mb-3" />
            <p className="text-white font-medium">Nenhum registro encontrado</p>
            <p className="text-sm text-muted mt-1">Ajuste os filtros ou aguarde novas ações na guild.</p>
          </div>
        ) : (
          <>
            <div className="overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[rgba(38,51,86,0.5)] bg-[#0a1122]/50">
                    <th className="text-left text-[11px] font-semibold tracking-wider text-muted uppercase px-4 py-3 w-[190px]">Data e hora</th>
                    <th className="text-left text-[11px] font-semibold tracking-wider text-muted uppercase px-4 py-3">Ação</th>
                    <th className="text-left text-[11px] font-semibold tracking-wider text-muted uppercase px-4 py-3 w-[130px]">Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((a) => {
                    const Icon = iconForType[a.type] ?? Clock;
                    const color = colorForType[a.type] ?? 'text-muted bg-muted/10 border-muted/20';
                    const d = toDate(a.createdAt);
                    return (
                      <tr key={a.id} className="border-b border-[rgba(38,51,86,0.2)] hover:bg-[rgba(109,40,217,0.04)] transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm text-white">
                            <Clock size={12} className="text-muted shrink-0" />
                            {formatDateTime(d)}
                          </div>
                          {d && <p className="text-[11px] text-muted ml-5">{d.toLocaleDateString('pt-BR')}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm leading-relaxed">{describe(a)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', color)}>
                            <Icon size={12} />
                            {typeLabels[a.type] ?? a.type}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <div className="p-4 flex justify-center border-t border-[rgba(38,51,86,0.3)]">
                <button
                  onClick={() => setLimitCount((c) => c + 50)}
                  className="px-4 py-2 rounded-lg border border-[rgba(38,51,86,0.5)] text-sm text-muted hover:text-white hover:border-accent/30 transition-colors flex items-center gap-2"
                >
                  <Loader2 size={14} /> Carregar mais ({filtered.length - limitCount} restantes)
                </button>
              </div>
            )}
            <div className="px-4 py-3 bg-[#0a1122]/30 border-t border-[rgba(38,51,86,0.3)]">
              <p className="text-xs text-muted">
                Exibindo {visible.length} de {filtered.length} registros filtrados • Total na guild: {activities.length}
                {guild?.name ? ` • ${guild.name}` : ''}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
