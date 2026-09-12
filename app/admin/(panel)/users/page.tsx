'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { AdminShell } from '@/components/admin/admin-shell';
import { Users, Search, Trash2, Ban, Crown, Check, Filter, X, AlertTriangle, Undo2 } from 'lucide-react';
import { usePermission } from '@/lib/admin/rbac/hooks';
import { getFirebaseDb } from '@/lib/admin/firebase/client';
import { cn } from '@/lib/admin/utils/cn';

type PlanId = 'free' | 'elite' | 'conquistador';
type UserStatus = 'active' | 'suspended' | 'banned';

type UserRow = {
  id: string;
  nickname: string;
  email: string;
  status: UserStatus;
  xp: number;
  guilds: number;
  plan: PlanId;
  planExpiresAt: Date | null;
  premium: boolean;
  premiumTooltip: string | null;
  createdAt: string;
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

export default function UsersPage() {
  const canBan = usePermission('users:ban');
  const canDelete = usePermission('users:delete');
  const canPremium = usePermission('users:premium');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);
  const [premiumUser, setPremiumUser] = useState<UserRow | null>(null);
  const [premiumPlan, setPremiumPlan] = useState<Exclude<PlanId, 'free'>>('elite');
  const [premiumDays, setPremiumDays] = useState('30');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const db = getFirebaseDb();
      const [usersSnap, guildsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'guilds')),
      ]);

      // Nº de guildas por usuário (memberOwnerIds contém os uids dos membros).
      const guildCount = new Map<string, number>();
      for (const g of guildsSnap.docs) {
        const owners = g.data()?.memberOwnerIds;
        if (Array.isArray(owners)) {
          for (const uid of owners) {
            if (typeof uid === 'string') guildCount.set(uid, (guildCount.get(uid) ?? 0) + 1);
          }
        }
      }

      const rows: UserRow[] = usersSnap.docs.map((d) => {
        const u = d.data();
        const rawPlan = u?.plan === 'elite' || u?.plan === 'conquistador'
          ? (u.plan as PlanId)
          : 'free';
        const expiresAt = rawPlan === 'free' ? null : toDate(u?.planExpiresAt);
        const premium = rawPlan !== 'free' && !!expiresAt && expiresAt.getTime() > Date.now();
        const plan: PlanId = premium ? rawPlan : 'free';
        const banned = u?.banned === true;
        const suspended = u?.isActive === false;
        const status: UserStatus = banned ? 'banned' : suspended ? 'suspended' : 'active';
        const nickname =
          (typeof u?.nickname === 'string' && u.nickname.trim()) ||
          (typeof u?.displayName === 'string' && u.displayName.trim()) ||
          '(sem nome)';
        return {
          id: d.id,
          nickname,
          email: typeof u?.email === 'string' ? u.email : '—',
          status,
          xp: typeof u?.xp === 'number' ? u.xp : 0,
          guilds: guildCount.get(d.id) ?? 0,
          plan,
          planExpiresAt: premium ? expiresAt : null,
          premium,
          premiumTooltip: premium && expiresAt
            ? `${rawPlan === 'elite' ? 'Elite' : 'Conquistador'} · expira em ${formatDate(expiresAt)} · ${formatRemaining(expiresAt)}`
            : null,
          createdAt: formatDate(toDate(u?.createdAt)),
        };
      });

      rows.sort((a, b) => a.nickname.localeCompare(b.nickname, 'pt-BR'));
      setUsers(rows);
    } catch {
      setLoadError('Não foi possível carregar os usuários. Verifique sua conexão e permissões.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      u.nickname.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  const patchUser = (id: string, patch: Partial<UserRow>) =>
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));

  const handleSuspend = async (user: UserRow) => {
    if (!canBan || actingId) return;
    const suspend = user.status !== 'suspended';
    if (!window.confirm(suspend ? `Suspender o usuário "${user.nickname}"?` : `Reativar o usuário "${user.nickname}"?`)) return;
    setActionError('');
    setActingId(user.id);
    try {
      await updateDoc(doc(getFirebaseDb(), 'users', user.id), { isActive: !suspend });
      patchUser(user.id, { status: suspend ? 'suspended' : 'active' });
    } catch {
      setActionError('Não foi possível alterar a suspensão. Verifique suas permissões.');
    } finally {
      setActingId(null);
    }
  };

  const handleBan = async (user: UserRow) => {
    if (!canBan || actingId) return;
    const ban = user.status !== 'banned';
    if (!window.confirm(ban ? `BANIR o usuário "${user.nickname}"?` : `Desbanir o usuário "${user.nickname}"?`)) return;
    setActionError('');
    setActingId(user.id);
    try {
      if (ban) {
        await updateDoc(doc(getFirebaseDb(), 'users', user.id), { banned: true, isActive: false });
        patchUser(user.id, { status: 'banned' });
      } else {
        await updateDoc(doc(getFirebaseDb(), 'users', user.id), { banned: false, isActive: true });
        patchUser(user.id, { status: 'active' });
      }
    } catch {
      setActionError('Não foi possível alterar o banimento. Verifique suas permissões.');
    } finally {
      setActingId(null);
    }
  };

  const handleDelete = async (user: UserRow) => {
    if (!canDelete || actingId) return;
    if (!window.confirm(`Excluir PERMANENTEMENTE o usuário "${user.nickname}"? Esta ação não pode ser desfeita.`)) return;
    setActionError('');
    setActingId(user.id);
    try {
      await deleteDoc(doc(getFirebaseDb(), 'users', user.id));
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      if (premiumUser?.id === user.id) setPremiumUser(null);
    } catch {
      setActionError('Não foi possível excluir o usuário. Somente super_admin/admin podem excluir.');
    } finally {
      setActingId(null);
    }
  };

  const callPremiumApi = async (uid: string, plan: PlanId, days: number) => {
    const res = await fetch('/api/admin/users/premium', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ uid, plan, days }),
    });
    let detail = '';
    try {
      detail = (await res.clone().json())?.error ?? '';
    } catch {
      detail = '';
    }
    if (!res.ok) {
      throw new Error(
        res.status === 403
          ? 'Acesso negado. Somente super_admin/admin gerenciam premium.'
          : res.status === 404
            ? 'Usuário não encontrado.'
            : `Falha no servidor (erro ${res.status}${detail ? `/${detail}` : ''}).`,
      );
    }
    try {
      const body = await res.json();
      return typeof body?.expiresAt === 'string' ? new Date(body.expiresAt) : null;
    } catch {
      return null;
    }
  };

  const handleApplyPremium = async () => {
    if (!canPremium || !premiumUser || actingId) return;
    const days = Math.max(1, Math.min(3650, Number(premiumDays) || 0));
    if (!days) {
      setActionError('Informe a quantidade de dias (1 a 3650).');
      return;
    }
    setActionError('');
    setActingId(premiumUser.id);
    try {
      const serverExpiry = await callPremiumApi(premiumUser.id, premiumPlan, days);
      const expiresAt = serverExpiry ?? new Date(Date.now() + days * 86400000);
      const tooltip = `${premiumPlan === 'elite' ? 'Elite' : 'Conquistador'} · expira em ${formatDate(expiresAt)} · ${formatRemaining(expiresAt)}`;
      patchUser(premiumUser.id, {
        plan: premiumPlan,
        planExpiresAt: expiresAt,
        premium: true,
        premiumTooltip: tooltip,
      });
      setPremiumUser(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Não foi possível aplicar o premium.');
    } finally {
      setActingId(null);
    }
  };

  const handleRemovePremium = async () => {
    if (!canPremium || !premiumUser || actingId) return;
    if (!window.confirm(`Remover o premium de "${premiumUser.nickname}" (plano volta para Free)?`)) return;
    setActionError('');
    setActingId(premiumUser.id);
    try {
      await callPremiumApi(premiumUser.id, 'free', 0);
      patchUser(premiumUser.id, {
        plan: 'free',
        planExpiresAt: null,
        premium: false,
        premiumTooltip: null,
      });
      setPremiumUser(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Não foi possível remover o premium.');
    } finally {
      setActingId(null);
    }
  };

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
            <p className="text-muted text-sm mt-1">
              {loading ? 'Carregando usuários...' : `${users.length} usuários cadastrados`}
            </p>
          </div>
          <button
            onClick={loadUsers}
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
                  <th className="w-28 px-5 py-4" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-muted text-sm">
                      Carregando usuários...
                    </td>
                  </tr>
                ) : loadError ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-red-400 text-sm">
                      {loadError}
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-muted text-sm">
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
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
                      <td className="px-5 py-4 text-white text-sm font-mono">{user.xp.toLocaleString('pt-BR')}</td>
                      <td className="px-5 py-4 text-muted text-sm">{user.guilds}</td>
                      <td className="px-5 py-4">
                        {user.premium ? (
                          <span
                            title={user.premiumTooltip ?? undefined}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 cursor-help"
                          >
                            <Crown size={12} />
                            {user.plan === 'elite' ? 'Elite' : 'Conquistador'}
                          </span>
                        ) : (
                          <span className="text-muted text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-muted text-sm">{user.createdAt}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          {canPremium && (
                            <button
                              title="Gerenciar premium"
                              onClick={() => {
                                setActionError('');
                                setPremiumPlan(user.plan === 'conquistador' ? 'conquistador' : 'elite');
                                setPremiumDays('30');
                                setPremiumUser(user);
                              }}
                              className="p-1.5 text-muted hover:text-amber-400 transition-colors"
                            >
                              <Crown size={15} />
                            </button>
                          )}
                          {canBan && user.status !== 'suspended' && user.status !== 'banned' && (
                            <button
                              title="Suspender"
                              onClick={() => handleSuspend(user)}
                              disabled={actingId === user.id}
                              className="p-1.5 text-muted hover:text-yellow-400 transition-colors disabled:opacity-40"
                            >
                              <Ban size={15} />
                            </button>
                          )}
                          {canBan && user.status === 'suspended' && (
                            <button
                              title="Reativar"
                              onClick={() => handleSuspend(user)}
                              disabled={actingId === user.id}
                              className="p-1.5 text-muted hover:text-emerald-400 transition-colors disabled:opacity-40"
                            >
                              <Undo2 size={15} />
                            </button>
                          )}
                          {canBan && user.status !== 'banned' && (
                            <button
                              title="Banir"
                              onClick={() => handleBan(user)}
                              disabled={actingId === user.id}
                              className="p-1.5 text-muted hover:text-red-400 transition-colors disabled:opacity-40"
                            >
                              <X size={15} />
                            </button>
                          )}
                          {canBan && user.status === 'banned' && (
                            <button
                              title="Desbanir"
                              onClick={() => handleBan(user)}
                              disabled={actingId === user.id}
                              className="p-1.5 text-muted hover:text-emerald-400 transition-colors disabled:opacity-40"
                            >
                              <Check size={15} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              title="Excluir usuário"
                              onClick={() => handleDelete(user)}
                              disabled={actingId === user.id}
                              className="p-1.5 text-muted hover:text-red-400 transition-colors disabled:opacity-40"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {premiumUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-heading font-bold text-white">Premium do usuário</h2>
              <button
                onClick={() => setPremiumUser(null)}
                className="p-1.5 text-muted hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-sm text-muted space-y-1">
              <p>
                Usuário: <span className="text-white font-medium">{premiumUser.nickname}</span>
              </p>
              <p>
                Atual:{' '}
                {premiumUser.premium ? (
                  <span className="text-amber-400 font-medium">
                    {premiumUser.plan === 'elite' ? 'Elite' : 'Conquistador'} · {formatRemaining(premiumUser.planExpiresAt!)}
                  </span>
                ) : (
                  <span className="text-muted">Free (sem premium)</span>
                )}
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
                disabled={actingId === premiumUser.id}
                className="flex-1 h-11 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {actingId === premiumUser.id ? 'Aplicando...' : 'Dar premium'}
              </button>
              {premiumUser.premium && (
                <button
                  onClick={handleRemovePremium}
                  disabled={actingId === premiumUser.id}
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
