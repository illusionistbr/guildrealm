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
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from 'firebase/storage';
import {
  ChevronLeft,
  ExternalLink,
  Eye,
  EyeOff,
  Gamepad2,
  Globe,
  ImagePlus,
  Languages,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Shield,
  ShieldCheck,
  Trash2,
  Unlink,
  UsersRound,
  X,
} from 'lucide-react';
import {
  getFirebaseApp,
  getFirebaseAuth,
  getFirebaseDb,
  getFirebaseStorage,
} from '@/lib/admin/firebase/client';
import { COLLECTIONS } from '@/lib/admin/firebase/collections';
import { cn } from '@/lib/admin/utils/cn';

const LINK_PLATFORMS = [
  { id: 'discord', label: 'Discord', placeholder: 'https://discord.gg/...' },
  { id: 'website', label: 'Website', placeholder: 'https://...' },
  { id: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/...' },
  { id: 'twitch', label: 'Twitch', placeholder: 'https://twitch.tv/...' },
  { id: 'twitter', label: 'X / Twitter', placeholder: 'https://x.com/...' },
  { id: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/...' },
];

const LANGUAGE_OPTIONS = [
  'Português',
  'Inglês',
  'Espanhol',
  'Francês',
  'Alemão',
  'Italiano',
  'Holandês',
  'Polonês',
  'Russo',
  'Japonês',
  'Coreano',
  'Chinês',
];

function normalizeLink(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v)) return `https://${v}`;
  return null;
}

type CommunityDoc = {
  id: string;
  ownerId?: string;
  ownerName?: string | null;
  name?: string;
  tag?: string;
  description?: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  languages?: string[];
  socialLinks?: Record<string, string>;
  showMembers?: boolean;
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

type MemberInfo = {
  id: string;
  name: string;
  guildName: string;
};

type LinkRequestDoc = {
  id: string;
  guildId?: string;
  guildName?: string;
  requesterUid?: string;
  status?: string;
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
  const showMembers = community?.showMembers !== false;
  const canSeeMembers = showMembers || isOwner;

  // Jogos jogados (agregado das guilds vinculadas).
  const games = useMemo(() => {
    const set = new Set<string>();
    for (const g of linkedGuilds) {
      if (g.game && g.game.trim()) set.add(g.game.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [linkedGuilds]);

  // Membros: personagens das guilds vinculadas.
  useEffect(() => {
    if (!canSeeMembers) {
      setMembers([]);
      return;
    }
    const guildById = new Map(linkedGuilds.map((g) => [g.id, g]));
    const ids: string[] = [];
    for (const g of linkedGuilds) {
      for (const m of g.members ?? []) {
        if (typeof m === 'string' && m && !ids.includes(m)) ids.push(m);
      }
    }
    if (ids.length === 0) {
      setMembers([]);
      return;
    }
    let disposed = false;
    setMembersLoading(true);
    const load = async () => {
      const db = getFirebaseDb();
      const byId = new Map<string, { name?: string; guildId?: string }>();
      for (let i = 0; i < ids.length; i += 30) {
        const chunk = ids.slice(i, i + 30);
        try {
          const snap = await getDocs(
            query(collection(db, 'characters'), where('__name__', 'in', chunk)),
          );
          snap.forEach((d) => {
            const data = d.data();
            byId.set(d.id, {
              name: typeof data?.name === 'string' ? data.name : undefined,
              guildId: typeof data?.guildId === 'string' ? data.guildId : undefined,
            });
          });
        } catch {}
      }
      if (disposed) return;
      const list: MemberInfo[] = ids.map((id) => {
        const info = byId.get(id);
        const guildName = (info?.guildId && guildById.get(info.guildId)?.name) || '—';
        return { id, name: info?.name?.trim() || '—', guildName };
      });
      list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      setMembers(list);
      setMembersLoading(false);
    };
    load();
    return () => {
      disposed = true;
    };
  }, [linkedGuilds, canSeeMembers]);
  const linkableGuilds = useMemo(
    () => myGuilds.filter((g) => !g.communityId),
    [myGuilds],
  );
  const [linkRequests, setLinkRequests] = useState<LinkRequestDoc[]>([]);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [linkMessage, setLinkMessage] = useState('');
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Edição (dono): banner, descrição, idiomas, links, visibilidade de membros.
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editLanguages, setEditLanguages] = useState<string[]>([]);
  const [editLinks, setEditLinks] = useState<Record<string, string>>({});
  const [editShowMembers, setEditShowMembers] = useState(true);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  // Pedidos pendentes (só o dono da comunidade enxerga — via rules).
  useEffect(() => {
    if (!isOwner) {
      setLinkRequests([]);
      return;
    }
    const unsub = onSnapshot(
      query(
        collection(getFirebaseDb(), COLLECTIONS.COMMUNITIES, communityId, 'linkRequests'),
        where('status', '==', 'PENDING'),
      ),
      (snap) => {
        const list: LinkRequestDoc[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as LinkRequestDoc));
        setLinkRequests(list);
      },
      () => setLinkRequests([]),
    );
    return unsub;
  }, [isOwner, communityId]);

  const handleLink = async (guildId: string) => {
    setBusy(true);
    setActionError('');
    setLinkMessage('');
    try {
      const fn = httpsCallable<{ guildId: string; communityId: string }, { success: boolean; linked?: boolean; pending?: boolean }>(
        getFunctions(getFirebaseApp()),
        'linkGuildToCommunity',
      );
      const res = await fn({ guildId, communityId });
      setShowLinkModal(false);
      // Comunidade alheia: vira pedido — só o dono aprova.
      if (res.data?.pending && !res.data?.linked) {
        setLinkMessage('Solicitação enviada! O dono da comunidade vai aprovar (ou não) o vínculo.');
      }
    } catch {
      setActionError('Não foi possível vincular a guild. Ela pode já estar em outra comunidade.');
    }
    setBusy(false);
  };

  const handleReview = async (guildId: string, decision: 'accepted' | 'rejected') => {
    setReviewingId(guildId);
    setActionError('');
    try {
      const fn = httpsCallable<{ communityId: string; guildId: string; decision: string }, { success: boolean }>(
        getFunctions(getFirebaseApp()),
        'reviewCommunityLinkRequest',
      );
      await fn({ communityId, guildId, decision });
    } catch {
      setActionError('Não foi possível avaliar a solicitação.');
    }
    setReviewingId(null);
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

  const openEdit = () => {
    if (!community) return;
    setEditDescription(community.description ?? '');
    setEditLanguages(Array.isArray(community.languages) ? community.languages.slice(0, 5) : []);
    setEditLinks({ ...(community.socialLinks ?? {}) });
    setEditShowMembers(community.showMembers !== false);
    setBannerFile(null);
    setBannerPreview(null);
    setActionError('');
    setShowEdit(true);
  };

  const toggleEditLanguage = (lang: string) => {
    setEditLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang].slice(0, 5),
    );
  };

  const handleSaveEdit = async () => {
    if (!community || !isOwner) return;
    setSaving(true);
    setActionError('');
    try {
      let bannerUrl = community.bannerUrl ?? null;
      if (bannerFile) {
        const ext = bannerFile.name.split('.').pop() ?? 'png';
        const fileRef = storageRef(getFirebaseStorage(), `community-banners/${community.id}/banner.${ext}`);
        await uploadBytes(fileRef, bannerFile, { contentType: bannerFile.type });
        bannerUrl = await getDownloadURL(fileRef);
      }
      const cleanLinks: Record<string, string> = {};
      for (const p of LINK_PLATFORMS) {
        const v = (editLinks[p.id] ?? '').trim().slice(0, 200);
        if (v) cleanLinks[p.id] = v;
      }
      await updateDoc(doc(getFirebaseDb(), COLLECTIONS.COMMUNITIES, community.id), {
        description: editDescription.trim().slice(0, 500) || null,
        languages: editLanguages.slice(0, 5),
        socialLinks: cleanLinks,
        showMembers: editShowMembers,
        bannerUrl,
        updatedAt: serverTimestamp(),
      });
      setShowEdit(false);
    } catch {
      setActionError('Não foi possível salvar as alterações.');
    }
    setSaving(false);
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
        {community.bannerUrl ? (
          <img src={community.bannerUrl} alt="" className="w-full h-40 object-cover border-b border-[rgba(38,51,86,0.3)]" />
        ) : (
          <div className="h-28 bg-gradient-to-r from-accent/25 via-accent/10 to-transparent border-b border-[rgba(38,51,86,0.3)]" />
        )}
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
            <div className="pb-1 min-w-0 flex-1">
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
            {isOwner && (
              <button
                onClick={openEdit}
                className="mb-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/15 border border-accent/30 text-accent text-xs font-medium hover:bg-accent hover:text-white transition-all shrink-0"
              >
                <Pencil size={13} /> Editar
              </button>
            )}
          </div>
          {community.description && (
            <p className="text-sm text-muted mt-4">{community.description}</p>
          )}
          {/* Idiomas + jogos */}
          {((community.languages?.length ?? 0) > 0 || games.length > 0) && (
            <div className="flex flex-wrap gap-2 mt-4">
              {(community.languages ?? []).map((lang) => (
                <span key={`lang-${lang}`} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300">
                  <Languages size={12} /> {lang}
                </span>
              ))}
              {games.map((game) => (
                <span key={`game-${game}`} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300">
                  <Gamepad2 size={12} /> {game}
                </span>
              ))}
            </div>
          )}
          {/* Links */}
          {community.socialLinks && Object.keys(community.socialLinks).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {Object.entries(community.socialLinks).map(([id, value]) => {
                const label = LINK_PLATFORMS.find((p) => p.id === id)?.label ?? id;
                const href = normalizeLink(value);
                return href ? (
                  <a
                    key={id}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-[rgba(38,51,86,0.5)] text-muted hover:text-white hover:border-accent/40 transition-colors"
                  >
                    <ExternalLink size={12} /> {label}
                  </a>
                ) : (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-[rgba(38,51,86,0.5)] text-muted"
                  >
                    <Globe size={12} /> {label}: {value}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {actionError}
        </div>
      )}

      {linkMessage && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm">
          {linkMessage}
        </div>
      )}

      {/* Solicitações de vínculo (só o dono aprova) */}
      {isOwner && linkRequests.length > 0 && (
        <div className="rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-950/20 to-[rgba(10,18,32,0.4)] p-6">
          <h2 className="text-lg font-heading font-bold text-white mb-1">
            Solicitações de vínculo ({linkRequests.length})
          </h2>
          <p className="text-xs text-muted mb-4">
            Donos de guilds querem vincular a guild deles à sua comunidade. Só vincule quem for do seu clã.
          </p>
          <div className="space-y-2">
            {linkRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center gap-3 rounded-lg border border-[rgba(38,51,86,0.3)] bg-[rgba(10,18,32,0.4)] p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">
                    {req.guildName || req.guildId}
                  </p>
                  <p className="text-xs text-muted">Quer vincular esta guild à comunidade</p>
                </div>
                <button
                  onClick={() => handleReview(req.guildId as string, 'rejected')}
                  disabled={reviewingId === req.guildId}
                  className="px-3 h-9 rounded-lg border border-red-500/30 text-red-400 text-xs hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  Recusar
                </button>
                <button
                  onClick={() => handleReview(req.guildId as string, 'accepted')}
                  disabled={reviewingId === req.guildId}
                  className="px-3 h-9 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {reviewingId === req.guildId && <Loader2 size={13} className="animate-spin" />}
                  Aceitar
                </button>
              </div>
            ))}
          </div>
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

      {/* Membros */}
      {canSeeMembers && (
        <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2">
              <UsersRound size={18} className="text-accent" />
              Membros ({members.length})
            </h2>
            {isOwner && !showMembers && (
              <span className="inline-flex items-center gap-1 text-xs text-yellow-400">
                <EyeOff size={13} /> Oculta para visitantes
              </span>
            )}
          </div>
          {membersLoading ? (
            <p className="text-sm text-muted">Carregando membros...</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted">Nenhum membro nas guilds vinculadas ainda.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-lg border border-[rgba(38,51,86,0.3)] bg-[rgba(10,18,32,0.4)] p-2.5"
                >
                  <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center font-heading font-bold text-accent text-sm shrink-0">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium truncate">{m.name}</p>
                    <p className="text-xs text-muted truncate">{m.guildName}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

      {/* Modal editar (dono) */}
      {showEdit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => !saving && setShowEdit(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#0a1122] p-6 shadow-2xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Editar comunidade</h3>
              <button
                onClick={() => setShowEdit(false)}
                disabled={saving}
                className="p-1.5 text-muted hover:text-white transition-colors disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1.5">Banner</label>
                <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#050912] overflow-hidden">
                  {(bannerPreview || community.bannerUrl) ? (
                    <img src={bannerPreview ?? community.bannerUrl ?? ''} alt="" className="w-full h-28 object-cover" />
                  ) : (
                    <div className="w-full h-28 flex items-center justify-center">
                      <ImagePlus size={22} className="text-muted" />
                    </div>
                  )}
                </div>
                <label className="inline-flex items-center gap-1.5 mt-2 px-3 h-9 rounded-lg border border-[rgba(38,51,86,0.5)] text-white text-xs hover:border-accent/40 transition-colors cursor-pointer">
                  <ImagePlus size={14} /> {bannerFile || community.bannerUrl ? 'Trocar banner' : 'Enviar banner'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 4 * 1024 * 1024) {
                        setActionError('Banner muito grande. Máximo 4MB.');
                        return;
                      }
                      setBannerFile(file);
                      setBannerPreview(URL.createObjectURL(file));
                    }}
                  />
                </label>
                <p className="text-xs text-muted mt-1">PNG, JPEG ou WebP até 4MB.</p>
              </div>

              <div>
                <label className="block text-sm text-muted mb-1.5">Descrição</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                  className="w-full px-3 py-2.5 bg-[#050912] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-muted mb-1.5">Idiomas (até 5)</label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGE_OPTIONS.map((lang) => {
                    const active = editLanguages.includes(lang);
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => toggleEditLanguage(lang)}
                        className={
                          active
                            ? 'px-3 h-8 rounded-full bg-accent/20 border border-accent/50 text-white text-xs font-medium transition-colors'
                            : 'px-3 h-8 rounded-full border border-[rgba(38,51,86,0.5)] text-muted text-xs hover:text-white transition-colors'
                        }
                      >
                        {lang}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted mb-1.5">Links</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {LINK_PLATFORMS.map((p) => (
                    <div key={p.id}>
                      <label className="block text-xs text-muted mb-1">{p.label}</label>
                      <input
                        type="text"
                        value={editLinks[p.id] ?? ''}
                        onChange={(e) => setEditLinks((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        placeholder={p.placeholder}
                        maxLength={200}
                        className="w-full h-10 px-3 bg-[#050912] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditShowMembers((v) => !v)}
                className="w-full flex items-center justify-between rounded-lg border border-[rgba(38,51,86,0.5)] bg-[#050912] px-3 py-2.5"
              >
                <span className="inline-flex items-center gap-2 text-sm text-white">
                  {editShowMembers ? <Eye size={15} className="text-emerald-400" /> : <EyeOff size={15} className="text-muted" />}
                  Mostrar lista de membros
                </span>
                <span className={cn(
                  'relative w-10 h-5.5 rounded-full transition-colors',
                  editShowMembers ? 'bg-accent' : 'bg-[rgba(38,51,86,0.8)]',
                )}>
                  <span className={cn(
                    'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',
                    editShowMembers ? 'left-5.5' : 'left-0.5',
                  )} />
                </span>
              </button>

              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="w-full h-11 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar alterações'
                )}
              </button>
            </div>
          </div>
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
              {isOwner
                ? 'Vínculo direto: esta comunidade é sua.'
                : 'Esta comunidade é de outro usuário: será enviada uma solicitação para o dono aprovar.'}
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
