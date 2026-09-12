'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { AdminShell } from '@/components/admin/admin-shell';
import {
  Shield,
  Search,
  Trash2,
  Crown,
  Ban,
  Check,
  Filter,
  X,
  AlertTriangle,
} from 'lucide-react';
import { usePermission } from '@/lib/admin/rbac/hooks';
import { getFirebaseDb } from '@/lib/admin/firebase/client';
import { cn } from '@/lib/admin/utils/cn';

type PlanId = 'free' | 'elite' | 'conquistador';

type GuildRow = {
  id: string;
  name: string;
  game: string;
  gm: string;
  ownerId: string;
  ownerName: string;
  members: number;
  isActive: boolean;
  createdAt: string;
  plan: PlanId;
  planExpiresAt: Date | null;
  premium: boolean;
  premiumTooltip: string | null;
};

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && typeof (value as { seconds?: unknown }).seconds === 'number') {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  return null;
}

function formatDate(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString('pt-BR');
}

function formatRemaining(expiresAt: Date): string {
  const diffMs = expiresAt.getTime() - Date.now();
  if (diffMs <= 0) return 'expirado';
  const days = Math.floor(diffMs / 86400000);
  if (days >= 1) return days === 1 ? 'resta 1 dia' : `restam ${days} dias`;
  const hours = Math.floor(diffMs / 3600000);
  if (hours >= 1) return hours === 1 ? 'resta 1 hora' : `restam ${hours} horas`;
  return 'resta menos de 1 hora';
}

export default function GuildsPage() {
  const canEdit = usePermission('guilds:edit');
  const canDelete = usePermission('guilds:delete');
  const canPremium = usePermission('users:premium');
  const [search, setSearch] = useState('');
  const [guilds, setGuilds] = useState<GuildRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);
  const [premiumGuild, setPremiumGuild] = useState<GuildRow | null>(null);
  const [premiumPlan, setPremiumPlan] = useState<Exclude<PlanId, 'free'>>('elite');
  const [premiumDays, setPremiumDays] = useState('30');

  const loadGuilds = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const snap = await getDocs(collection(getFirebaseDb(), 'guilds'));
      const raw = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Record<string, unknown> & { id: string });

      // Planos dos donos (o premium é do usuário dono; a guilda herda).
      const ownerIds = [...new Set(raw.map((g) => String(g.ownerId ?? '')).filter(Boolean))];
      const ownerMap = new Map<string, Record<string, unknown>>();
      await Promise.all(
        ownerIds.map(async (uid) => {
          try {
            const u = await getDoc(doc(getFirebaseDb(), 'users', uid));
            if (u.exists()) ownerMap.set(uid, u.data());
          } catch {
            // Sem acesso ao dono: trata como sem premium.
          }
        }),
      );

      const rows: GuildRow[] = raw.map((g) => {
        const ownerId = String(g.ownerId ?? '');
        const owner = ownerMap.get(ownerId);
        const rawPlan = owner?.plan === 'elite' || owner?.plan === 'conquistador'
          ? (owner.plan as PlanId)
          : 'free';
        const expiresAt = rawPlan === 'free' ? null : toDate(owner?.planExpiresAt);
        const premium = rawPlan !== 'free' && !!expiresAt && expiresAt.getTime() > Date.now();
        const plan: PlanId = premium ? rawPlan : 'free';
        const gm =
          (typeof g.ownerCharacterName === 'string' && g.ownerCharacterName.trim()) ||
          (typeof g.ownerName === 'string' && g.ownerName.trim()) ||
          (typeof owner?.displayName === 'string' && owner.displayName.trim()) ||
          '—';
        return {
          id: g.id,
          name: typeof g.name === 'string' ? g.name : '(sem nome)',
          game: typeof g.game === 'string' && g.game ? g.game : '—',
          gm,
          ownerId,
          ownerName:
            (typeof owner?.displayName === 'string' && owner.displayName.trim()) ||
            (typeof g.ownerName === 'string' && g.ownerName.trim()) ||
            '—',
          members: Array.isArray(g.members) ? g.members.length : 0,
          isActive: g.isActive !== false,
          createdAt: formatDate(toDate(g.createdAt)),
          plan,
          planExpiresAt: premium ? expiresAt : null,
          premium,
          premiumTooltip: premium && expiresAt
            ? `${rawPlan === 'elite' ? 'Elite' : 'Conquistador'} · expira em ${formatDate(expiresAt)} · ${formatRemaining(expiresAt)}`
            : null,
        };
      });

      rows.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      setGuilds(rows);
    } catch {
      setLoadError('Não foi possível carregar as guildas. Verifique sua conexão e permissões.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGuilds();
  }, [loadGuilds]);

  const filtered = guilds.filter((g) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      g.name.toLowerCase().includes(q) ||
      g.game.toLowerCase().includes(q) ||
      g.gm.toLowerCase().includes(q)
    );
  });

  const handleToggleActive = async (guild: GuildRow) => {
    if (!canEdit || actingId) return;
    const action = guild.isActive ? 'inativar' : 'reativar';
    if (!window.confirm(`Deseja ${action} a guilda "${guild.name}"?`)) return;
    setActionError('');
    setActingId(guild.id);
    try {
      await updateDoc(doc(getFirebaseDb(), 'guilds', guild.id), { isActive: !guild.isActive });
      setGuilds((prev) => prev.map((g) => (g.id === guild.id ? { ...g, isActive: !g.isActive } : g)));
    } catch {
      setActionError(`Não foi possível ${action} a guilda. Verifique suas permissões.`);
    } finally {
      setActingId(null);
    }
  };

  const handleDelete = async (guild: GuildRow) => {
    if (!canDelete || actingId) return;
    if (!window.confirm(`Excluir PERMANENTEMENTE a guilda "${guild.name}" (${guild.members} membro(s))? Esta ação não pode ser desfeita.`)) return;
    setActionError('');
    setActingId(guild.id);
    try {
      await deleteDoc(doc(getFirebaseDb(), 'guilds', guild.id));
      setGuilds((prev) => prev.filter((g) => g.id !== guild.id));
      if (premiumGuild?.id === guild.id) setPremiumGuild(null);
    } catch {
      setActionError('Não foi possível excluir a guilda. Somente super_admin/admin podem excluir.');
    } finally {
      setActingId(null);
    }
  };

  const handleApplyPremium = async () => {
    if (!canPremium || !premiumGuild || actingId) return;
    const days = Math.max(1, Math.min(3650, Number(premiumDays) || 0));
    if (!days) {
      setActionError('Informe a quantidade de dias (1 a 3650).');
      return;
    }
    setActionError('');
    setActingId(premiumGuild.id);
    try {
      const expiresAt = new Date(Date.now() + days * 86400000);
      await updateDoc(doc(getFirebaseDb(), 'users', premiumGuild.ownerId), {
        plan: premiumPlan,
        premium: true,
        planStartedAt: Timestamp.now(),
        planExpiresAt: Timestamp.fromDate(expiresAt),
      });
      const tooltip = `${premiumPlan === 'elite' ? 'Elite' : 'Conquistador'} · expira em ${formatDate(expiresAt)} · ${formatRemaining(expiresAt)}`;
      setGuilds((prev) =>
        prev.map((g) =>
          g.id === premiumGuild.id
            ? { ...g, plan: premiumPlan, planExpiresAt: expiresAt, premium: true, premiumTooltip: tooltip }
            : g,
        ),
      );
      setPremiumGuild(null);
    } catch {
      setActionError('Não foi possível aplicar o premium. Verifique suas permissões.');
    } finally {
      setActingId(null);
    }
  };

  const handleRemovePremium = async () => {
    if (!canPremium || !premiumGuild || actingId) return;
    if (!window.confirm(`Remover o premium do dono da guilda "${premiumGuild.name}" (plano volta para Free)?`)) return;
    setActionError('');
    setActingId(premiumGuild.id);
    try {
      await updateDoc(doc(getFirebaseDb(), 'users', premiumGuild.ownerId), {
        plan: 'free',
        premium: false,
        planStartedAt: null,
        planExpiresAt: null,
      });
      setGuilds((prev) =>
        prev.map((g) =>
          g.id === premiumGuild.id
            ? { ...g, plan: 'free' as PlanId, planExpiresAt: null, premium: false, premiumTooltip: null }
            : g,
        ),
      );
      setPremiumGuild(null);
    } catch {
      setActionError('Não foi possível remover o premium. Verifique suas permissões.');
    } finally {
      setActingId(null);
    }
  };

  const statusConfig = {
    active: { label: 'Ativa', class: 'bg-emerald-500/10 text-emerald-400' },
    inactive: { label: 'Inativa', class: 'bg-muted/10 text-muted' },
  };

  return (
    <AdminShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-white">Guildas</h1>
            <p className="text-muted text-sm mt-1">
              {loading ? 'Carregando guildas...' : `${guilds.length} guildas registradas`}
            </p>
          </div>
          <button
            onClick={loadGuilds}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0a1122] border border-[rgba(38,51,86,0.7)] hover:border-accent/50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Atualizar
          </button>
        </div>

        {actionError && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            <AlertTriangle size={16} />
            {actionError}
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Buscar por nome, jogo ou GM..."
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
                  <th className="text-left text-xs font-medium text-muted uppercase px-5 py-4">Premium</th>
                  <th className="text-left text-xs font-medium text-muted uppercase px-5 py-4">Status</th>
                  <th className="text-left text-xs font-medium text-muted uppercase px-5 py-4">Criada em</th>
                  <th className="w-28 px-5 py-4" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-muted text-sm">
                      Carregando guildas...
                    </td>
                  </tr>
                ) : loadError ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-red-400 text-sm">
                      {loadError}
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-muted text-sm">
                      Nenhuma guilda encontrada.
                    </td>
                  </tr>
                ) : (
                  filtered.map((guild) => {
                    const status = guild.isActive ? statusConfig.active : statusConfig.inactive;
                    return (
                      <tr key={guild.id} className="border-b border-[rgba(38,51,86,0.3)] hover:bg-[rgba(109,40,217,0.04)] transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                              <Shield size={16} className="text-accent" />
                            </div>
                            <span className="text-white text-sm font-medium">{guild.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-muted text-sm">{guild.game}</td>
                        <td className="px-5 py-4 text-white text-sm">{guild.gm}</td>
                        <td className="px-5 py-4 text-muted text-sm">{guild.members}</td>
                        <td className="px-5 py-4">
                          {guild.premium ? (
                            <span
                              title={guild.premiumTooltip ?? undefined}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 cursor-help"
                            >
                              <Crown size={12} />
                              Sim · {guild.plan === 'elite' ? 'Elite' : 'Conquistador'}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted/10 text-muted">
                              Não
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', status.class)}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-muted text-sm">{guild.createdAt}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1">
                            {canPremium && (
                              <button
                                title="Gerenciar premium"
                                onClick={() => {
                                  setActionError('');
                                  setPremiumPlan(guild.plan === 'conquistador' ? 'conquistador' : 'elite');
                                  setPremiumDays('30');
                                  setPremiumGuild(guild);
                                }}
                                className="p-1.5 text-muted hover:text-amber-400 transition-colors"
                              >
                                <Crown size={15} />
                              </button>
                            )}
                            {canEdit && (
                              <button
                                title={guild.isActive ? 'Inativar guilda' : 'Reativar guilda'}
                                onClick={() => handleToggleActive(guild)}
                                disabled={actingId === guild.id}
                                className="p-1.5 text-muted hover:text-yellow-400 transition-colors disabled:opacity-40"
                              >
                                {guild.isActive ? <Ban size={15} /> : <Check size={15} />}
                              </button>
                            )}
                            {canDelete && (
                              <button
                                title="Excluir guilda"
                                onClick={() => handleDelete(guild)}
                                disabled={actingId === guild.id}
                                className="p-1.5 text-muted hover:text-red-400 transition-colors disabled:opacity-40"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {premiumGuild && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-heading font-bold text-white">Premium da guilda</h2>
              <button
                onClick={() => setPremiumGuild(null)}
                className="p-1.5 text-muted hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-sm text-muted space-y-1">
              <p>
                Guilda: <span className="text-white font-medium">{premiumGuild.name}</span>
              </p>
              <p>
                Dono: <span className="text-white font-medium">{premiumGuild.ownerName}</span>
              </p>
              <p>
                Atual:{' '}
                {premiumGuild.premium ? (
                  <span className="text-amber-400 font-medium">
                    {premiumGuild.plan === 'elite' ? 'Elite' : 'Conquistador'} · {formatRemaining(premiumGuild.planExpiresAt!)}
                  </span>
                ) : (
                  <span className="text-muted">Free (sem premium)</span>
                )}
              </p>
              <p className="text-xs">
                O premium é do dono: vale para todas as guildas dele.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted mb-2">Plano</label>
              <div className="grid grid-cols-2 gap-2">
                {(['elite', 'conquistador'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPremiumPlan(p)}
                    className={cn(
                      'py-2.5 rounded-lg text-sm font-medium border transition-colors capitalize',
                      premiumPlan === p
                        ? 'bg-accent/20 border-accent/50 text-white'
                        : 'bg-[#050912] border-[rgba(38,51,86,0.7)] text-muted hover:text-white',
                    )}
                  >
                    {p === 'elite' ? 'Elite' : 'Conquistador'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted mb-2">Dias (1 a 3650)</label>
              <input
                type="number"
                min={1}
                max={3650}
                value={premiumDays}
                onChange={(e) => setPremiumDays(e.target.value)}
                className="w-full h-11 px-4 bg-[#050912] border border-[rgba(38,51,86,0.7)] rounded-lg text-white focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleApplyPremium}
                disabled={actingId === premiumGuild.id}
                className="flex-1 h-11 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {actingId === premiumGuild.id ? 'Aplicando...' : 'Dar premium'}
              </button>
              {premiumGuild.premium && (
                <button
                  onClick={handleRemovePremium}
                  disabled={actingId === premiumGuild.id}
                  className="flex-1 h-11 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  Retirar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
