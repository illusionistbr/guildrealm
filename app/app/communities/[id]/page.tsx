'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  ChevronLeft,
  Gamepad2,
  Link2,
  Loader2,
  Plus,
  Shield,
  ShieldCheck,
  Trash2,
  Unlink,
  UsersRound,
} from 'lucide-react';
import {
  getFirebaseApp,
  getFirebaseAuth,
  getFirebaseDb,
} from '@/lib/admin/firebase/client';
import { COLLECTIONS } from '@/lib/admin/firebase/collections';
import { cn } from '@/lib/admin/utils/cn';

type CommunityDoc = {
  id: string;
  ownerId?: string;
  ownerName?: string | null;
  name?: string;
  tag?: string;
  description?: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  guildIds?: string[];
};

type GuildDoc = {
  id: string;
  ownerId?: string;
  name?: string;
  game?: string;
  members?: string[];
  logoUrl?: string | null;
  communityId?: string | null;
};

export default function CommunityDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const communityId = params.id;

  const [uid, setUid] = useState<string | null>(null);
  const [community, setCommunity] = useState<CommunityDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [linkedGuilds, setLinkedGuilds] = useState<GuildDoc[]>([]);
  const [myGuilds, setMyGuilds] = useState<GuildDoc[]>([]);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      setUid(user.uid);
    });
    return unsub;
  }, [router]);

  useEffect(() => {
    if (!communityId) return;
    const unsub = onSnapshot(
      doc(getFirebaseDb(), COLLECTIONS.COMMUNITIES, communityId),
      (snap) => {
        if (snap.exists()) {
          setCommunity({ id: snap.id, ...snap.data() } as CommunityDoc);
          setNotFound(false);
        } else {
          setCommunity(null);
          setNotFound(true);
        }
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [communityId]);

  // Guilds vinculadas (pelos ids da comunidade)
  useEffect(() => {
    const ids = community?.guildIds ?? [];
    if (ids.length === 0) {
      setLinkedGuilds([]);
      return;
    }
    let disposed = false;
    const load = async () => {
      const db = getFirebaseDb();
      const results: GuildDoc[] = [];
      // Firestore limita `in` a 30; comunidades são pequenas — busca em lotes
      for (let i = 0; i < ids.length; i += 30) {
        const chunk = ids.slice(i, i + 30);
        try {
          const snap = await getDocs(
            query(collection(db, COLLECTIONS.GUILDS), where('__name__', 'in', chunk)),
          );
          snap.forEach((d) => results.push({ id: d.id, ...d.data() } as GuildDoc));
        } catch {}
      }
      if (!disposed) {
        results.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
        setLinkedGuilds(results);
      }
    };
    load();
    return () => {
      disposed = true;
    };
  }, [community]);

  // Guilds do próprio usuário (para vincular — já respeitam o limite do plano)
  useEffect(() => {
    if (!uid) return;
    let disposed = false;
    getDocs(query(collection(getFirebaseDb(), COLLECTIONS.GUILDS), where('ownerId', '==', uid)))
      .then((snap) => {
        if (disposed) return;
        const list: GuildDoc[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as GuildDoc));
        setMyGuilds(list);
      })
      .catch(() => {});
    return () => {
      disposed = true;
    };
  }, [uid, linkedGuilds.length]);

  const isOwner = !!uid && community?.ownerId === uid;
  const linkableGuilds = useMemo(
    () => myGuilds.filter((g) => !g.communityId),
    [myGuilds],
  );

  const handleLink = async (guildId: string) => {
    setBusy(true);
    setActionError('');
    try {
      const fn = httpsCallable<{ guildId: string; communityId: string }, { success: boolean }>(
        getFunctions(getFirebaseApp()),
        'linkGuildToCommunity',
      );
      await fn({ guildId, communityId });
      setShowLinkModal(false);
    } catch {
      setActionError('Não foi possível vincular a guild. Ela pode já estar em outra comunidade.');
    }
    setBusy(false);
  };

  const handleUnlink = async (guildId: string) => {
    setUnlinkingId(guildId);
    setActionError('');
    try {
      const fn = httpsCallable<{ guildId: string }, { success: boolean }>(
        getFunctions(getFirebaseApp()),
        'unlinkGuildFromCommunity',
      );
      await fn({ guildId });
    } catch {
      setActionError('Não foi possível desvincular a guild.');
    }
    setUnlinkingId(null);
  };

  const handleDelete = async () => {
    setBusy(true);
    setActionError('');
    try {
      const fn = httpsCallable<{ communityId: string }, { success: boolean }>(
        getFunctions(getFirebaseApp()),
        'deleteCommunity',
      );
      await fn({ communityId });
      router.replace('/app/communities');
    } catch {
      setActionError('Não foi possível excluir a comunidade.');
      setBusy(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="h-40 rounded-xl border border-[rgba(38,51,86,0.5)] bg-[rgba(19,29,48,0.4)] animate-pulse" />
      </div>
    );
  }

  if (notFound || !community) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <Shield size={28} className="text-accent mx-auto mb-4" />
        <p className="text-white font-heading font-bold">Comunidade não encontrada</p>
        <Link href="/app/communities" className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover mt-4">
          <ChevronLeft size={16} /> Voltar para comunidades
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/app/communities"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-white transition-colors"
      >
        <ChevronLeft size={18} /> Comunidades
      </Link>

      {/* Cabeçalho */}
      <div className="rounded-xl overflow-hidden border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.8)] to-[rgba(10,18,32,0.6)]">
        <div className="h-28 bg-gradient-to-r from-accent/25 via-accent/10 to-transparent border-b border-[rgba(38,51,86,0.3)]" />
        <div className="px-6 pb-6 -mt-10">
          <div className="flex items-end gap-4">
            <div className="w-20 h-20 rounded-2xl border-4 border-[#0a1122] bg-[#0a1122] flex items-center justify-center overflow-hidden shrink-0">
              {community.logoUrl ? (
                <img src={community.logoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-accent/15 flex items-center justify-center font-heading font-bold text-accent text-2xl">
                  {community.name?.charAt(0).toUpperCase() || 'C'}
                </div>
              )}
            </div>
            <div className="pb-1 min-w-0">
              <h1 className="text-xl font-heading font-bold text-white truncate">{community.name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {community.tag && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent">[{community.tag}]</span>
                )}
                {isOwner && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400">Sua comunidade</span>
                )}
              </div>
            </div>
          </div>
          {community.description && (
            <p className="text-sm text-muted mt-4">{community.description}</p>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {actionError}
        </div>
      )}

      {/* Guilds vinculadas */}
      <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2">
            <Shield size={18} className="text-accent" />
            Guilds vinculadas ({linkedGuilds.length})
          </h2>
          {linkableGuilds.length > 0 && (
            <button
              onClick={() => setShowLinkModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/15 border border-accent/30 text-accent text-xs font-medium hover:bg-accent hover:text-white transition-all"
            >
              <Link2 size={14} /> Vincular guild
            </button>
          )}
        </div>

        {linkedGuilds.length === 0 ? (
          <div className="text-center py-8">
            <ShieldCheck size={26} className="text-muted mx-auto mb-3" />
            <p className="text-sm text-muted">Nenhuma guild vinculada ainda.</p>
            {isOwner ? (
              <p className="text-xs text-muted mt-1">Vincule as guilds do seu clã — cada uma em seus jogos.</p>
            ) : (
              <p className="text-xs text-muted mt-1">O dono da guild pode vinculá-la a esta comunidade.</p>
            )}
            {linkableGuilds.length > 0 && (
              <button
                onClick={() => setShowLinkModal(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-colors"
              >
                <Plus size={14} /> Vincular minha guild
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {linkedGuilds.map((g) => {
              const canUnlink = uid === g.ownerId || isOwner;
              return (
                <div
                  key={g.id}
                  className="flex items-center gap-3 rounded-lg border border-[rgba(38,51,86,0.3)] bg-[rgba(10,18,32,0.4)] p-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent/15 border border-accent/20 flex items-center justify-center overflow-hidden shrink-0">
                    {g.logoUrl ? (
                      <img src={g.logoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Shield size={16} className="text-accent" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{g.name}</p>
                    <p className="text-xs text-muted flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center gap-1"><Gamepad2 size={12} /> {g.game ?? '—'}</span>
                      <span className="inline-flex items-center gap-1"><UsersRound size={12} /> {g.members?.length ?? 0}</span>
                    </p>
                  </div>
                  <Link
                    href={`/guilds/${g.id}?from=community`}
                    className="text-xs text-accent hover:text-accent-hover shrink-0"
                  >
                    Ver guild
                  </Link>
                  {canUnlink && (
                    <button
                      onClick={() => handleUnlink(g.id)}
                      disabled={unlinkingId === g.id}
                      title="Desvincular guild"
                      className="p-1.5 rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 shrink-0"
                    >
                      {unlinkingId === g.id ? <Loader2 size={15} className="animate-spin" /> : <Unlink size={15} />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Zona do dono */}
      {isOwner && (
        <div className="rounded-xl border border-red-500/20 bg-gradient-to-br from-red-950/20 to-[rgba(10,18,32,0.4)] p-6">
          <h2 className="text-lg font-heading font-bold text-red-400 mb-1">Gerenciar comunidade</h2>
          <p className="text-xs text-muted mb-4">Excluir remove a comunidade e desvincula as guilds (as guilds são mantidas).</p>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-colors"
            >
              Excluir comunidade
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-white">Tem certeza? Essa ação não pode ser desfeita.</p>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={busy}
                className="px-4 py-2 rounded-lg border border-[rgba(38,51,86,0.5)] text-muted text-sm disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Confirmar exclusão
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal vincular */}
      {showLinkModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => !busy && setShowLinkModal(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#0a1122] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-1">Vincular guild</h3>
            <p className="text-xs text-muted mb-4">
              Somente suas guilds sem vínculo (limite do plano: {myGuilds.length} sua(s)).
            </p>
            <div className="space-y-2 max-h-72 overflow-auto">
              {linkableGuilds.map((g) => (
                <button
                  key={g.id}
                  onClick={() => handleLink(g.id)}
                  disabled={busy}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-lg border border-[rgba(38,51,86,0.3)] bg-[rgba(10,18,32,0.4)] p-3 text-left transition-colors',
                    busy ? 'opacity-50' : 'hover:border-accent/40',
                  )}
                >
                  <div className="w-9 h-9 rounded-lg bg-accent/15 border border-accent/20 flex items-center justify-center overflow-hidden shrink-0">
                    {g.logoUrl ? (
                      <img src={g.logoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Shield size={14} className="text-accent" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{g.name}</p>
                    <p className="text-xs text-muted">{g.game ?? '—'} • {g.members?.length ?? 0} membros</p>
                  </div>
                  {busy ? <Loader2 size={15} className="animate-spin text-muted" /> : <Link2 size={15} className="text-accent shrink-0" />}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowLinkModal(false)}
              disabled={busy}
              className="mt-4 w-full h-10 rounded-lg border border-[rgba(38,51,86,0.5)] text-muted text-sm disabled:opacity-50"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
