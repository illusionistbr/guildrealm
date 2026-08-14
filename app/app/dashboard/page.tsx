'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { onAuthStateChanged } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  type QuerySnapshot,
} from 'firebase/firestore';
import {
  getFirebaseApp,
  getFirebaseAuth,
  getFirebaseDb,
} from '@/lib/admin/firebase/client';
import { COLLECTIONS } from '@/lib/admin/firebase/collections';
import { cn } from '@/lib/admin/utils/cn';
import {
  AlertTriangle,
  ChevronRight,
  Crown,
  LayoutDashboard,
  Loader2,
  LogIn,
  Pencil,
  Plus,
  Shield,
  Sword,
  Trash2,
  Users,
  X,
} from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

type CharacterDoc = {
  id: string;
  ownerId?: string;
  name?: string;
  className?: string;
  game?: string;
  level?: number;
  guildId?: string;
  createdAt?: { seconds: number };
};

type GuildDoc = {
  id: string;
  ownerId?: string;
  name?: string;
  tag?: string;
  game?: string;
  faction?: string;
  recruitment?: 'open' | 'closed';
  ownerCharacterId?: string;
  members?: string[];
  memberOwnerIds?: string[];
  createdAt?: { seconds: number };
};

type UserDoc = {
  id: string;
  displayName?: string;
};

type ClassOption = { value: string; label: string; icon?: string };

export default function UserDashboard() {
  const t = useTranslations('Dashboard');
  const router = useRouter();

  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [characters, setCharacters] = useState<CharacterDoc[]>([]);
  const [guilds, setGuilds] = useState<GuildDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [joinCharacter, setJoinCharacter] = useState<CharacterDoc | null>(null);
  const [openGuilds, setOpenGuilds] = useState<GuildDoc[]>([]);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [guildAction, setGuildAction] = useState<{
    characterId: string;
    busy: boolean;
    error: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CharacterDoc | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const ownedGuildsRef = useRef<Map<string, GuildDoc>>(new Map());
  const memberGuildsRef = useRef<Map<string, GuildDoc>>(new Map());

  useEffect(() => {
    let disposed = false;
    const cleanups: (() => void)[] = [];

    const unsubAuth = onAuthStateChanged(getFirebaseAuth(), async (user) => {
      if (disposed) return;
      if (!user) {
        router.replace('/login');
        return;
      }

      const db = getFirebaseDb();
      setLoading(true);
      setError(false);

      try {
        const userSnap = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));
        if (!disposed && userSnap.exists()) {
          setUserDoc({ id: userSnap.id, ...userSnap.data() } as UserDoc);
        }

        const mergeCharacters = (snap: QuerySnapshot) => {
          const map = new Map<string, CharacterDoc>();
          snap.forEach((d) => {
            map.set(d.id, { id: d.id, ...d.data() } as CharacterDoc);
          });
          setCharacters(
            [...map.values()].sort(
              (a, b) =>
                (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0),
            ),
          );
        };

        const mergeOwnedGuilds = (snap: QuerySnapshot) => {
          const map = new Map<string, GuildDoc>();
          snap.forEach((d) => {
            map.set(d.id, { id: d.id, ...d.data() } as GuildDoc);
          });
          ownedGuildsRef.current = map;
          applyGuilds();
        };

        const mergeMemberGuilds = (snap: QuerySnapshot) => {
          const map = new Map<string, GuildDoc>();
          snap.forEach((d) => {
            map.set(d.id, { id: d.id, ...d.data() } as GuildDoc);
          });
          memberGuildsRef.current = map;
          applyGuilds();
        };

        const applyGuilds = () => {
          const merged = new Map<string, GuildDoc>(ownedGuildsRef.current);
          memberGuildsRef.current.forEach((g, id) => merged.set(id, g));
          setGuilds(
            [...merged.values()].sort(
              (a, b) =>
                (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0),
            ),
          );
        };

        cleanups.push(
          onSnapshot(
            query(
              collection(db, COLLECTIONS.CHARACTERS),
              where('ownerId', '==', user.uid),
            ),
            mergeCharacters,
          ),
          onSnapshot(
            query(
              collection(db, COLLECTIONS.GUILDS),
              where('ownerId', '==', user.uid),
            ),
            mergeOwnedGuilds,
          ),
          onSnapshot(
            query(
              collection(db, COLLECTIONS.GUILDS),
              where('memberOwnerIds', 'array-contains', user.uid),
            ),
            mergeMemberGuilds,
          ),
          onSnapshot(
            query(
              collection(db, COLLECTIONS.GUILDS),
              where('members', 'array-contains', user.uid),
            ),
            mergeMemberGuilds,
          ),
        );

        if (!disposed) setLoading(false);
      } catch {
        if (!disposed) {
          setLoading(false);
          setError(true);
        }
      }
    });

    cleanups.push(unsubAuth);

    return () => {
      disposed = true;
      cleanups.forEach((fn) => fn());
    };
  }, [router, reloadKey]);

  const classOptions = useMemo(() => t.raw('classes') as ClassOption[], [t]);

  const gameOptions = useMemo(() => t.raw('games') as ClassOption[], [t]);

  const classLabel = (value?: string) =>
    classOptions.find((c) => c.value === value)?.label ?? value;

  const gameLabel = (value?: string) =>
    gameOptions.find((g) => g.value === value)?.label ?? value;

  const displayName = userDoc?.displayName?.trim() || t('adventurer');

  const guildById = useMemo(() => {
    const map = new Map<string, GuildDoc>();
    guilds.forEach((g) => map.set(g.id, g));
    return map;
  }, [guilds]);

  const openJoinModal = async (character: CharacterDoc) => {
    setJoinCharacter(character);
    setJoinError('');
    setJoinLoading(true);
    setOpenGuilds([]);
    try {
      const snap = await getDocs(
        query(
          collection(getFirebaseDb(), COLLECTIONS.GUILDS),
          where('game', '==', character.game ?? 'aion2'),
          where('recruitment', '==', 'open'),
        ),
      );
      const list: GuildDoc[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as GuildDoc);
      });
      setOpenGuilds(
        list.filter((g) => !(g.members ?? []).includes(character.id)),
      );
    } catch {
      setJoinError(t('joinError'));
    }
    setJoinLoading(false);
  };

  const handleJoin = async (guild: GuildDoc) => {
    if (!joinCharacter) return;
    setJoinError('');
    try {
      const fn = httpsCallable<{ characterId: string; guildId: string }, { success: boolean }>(
        getFunctions(getFirebaseApp()),
        'joinGuild',
      );
      await fn({ characterId: joinCharacter.id, guildId: guild.id });
      setJoinCharacter(null);
    } catch {
      setJoinError(t('joinError'));
    }
  };

  const handleLeave = async (character: CharacterDoc) => {
    setGuildAction({ characterId: character.id, busy: true, error: '' });
    try {
      const fn = httpsCallable<{ characterId: string }, { success: boolean }>(
        getFunctions(getFirebaseApp()),
        'leaveGuild',
      );
      await fn({ characterId: character.id });
      setGuildAction(null);
    } catch {
      setGuildAction({ characterId: character.id, busy: false, error: t('leaveError') });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError('');
    setDeleteLoading(true);
    try {
      const fn = httpsCallable<{ characterId: string }, { success: boolean }>(
        getFunctions(getFirebaseApp()),
        'deleteCharacter',
      );
      await fn({ characterId: deleteTarget.id });
      setDeleteTarget(null);
    } catch (err) {
      const e = err as { code?: string };
      setDeleteError(
        e?.code === 'functions/failed-precondition'
          ? t('deleteInGuildError')
          : t('deleteError'),
      );
    }
    setDeleteLoading(false);
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={stagger}
      className="space-y-8"
    >
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-white">
          {t('welcomeBack')} <span className="text-accent">{displayName}</span>
        </h1>
        <p className="text-muted mt-1">{t('subtitle')}</p>
      </motion.div>

      <CreateActions />

      {error ? (
        <ErrorState onRetry={() => setReloadKey((k) => k + 1)} />
      ) : loading ? (
        <SkeletonGrid />
      ) : (
        <div className="space-y-8">
          <CharactersSection
            characters={characters}
            guildById={guildById}
            classLabel={classLabel}
            gameLabel={gameLabel}
            onCreateFirst={t('createFirstCharacter')}
            onJoin={openJoinModal}
            onLeave={handleLeave}
            onDelete={setDeleteTarget}
            guildAction={guildAction}
          />
          <GuildsSection
            guilds={guilds}
            uid={userDoc?.id}
            onCreateFirst={t('createFirstGuild')}
          />
        </div>
      )}

      {joinCharacter && (
        <JoinGuildModal
          character={joinCharacter}
          guilds={openGuilds}
          loading={joinLoading}
          error={joinError}
          onClose={() => setJoinCharacter(null)}
          onJoin={handleJoin}
        />
      )}

      {deleteTarget && (
        <DeleteCharacterModal
          character={deleteTarget}
          loading={deleteLoading}
          error={deleteError}
          onClose={() => {
            if (deleteLoading) return;
            setDeleteTarget(null);
            setDeleteError('');
          }}
          onConfirm={handleDelete}
        />
      )}
    </motion.div>
  );
}

function CreateActions() {
  const t = useTranslations('Dashboard');

  return (
    <motion.div
      variants={fadeUp}
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      <Link
        href="/app/characters/new"
        className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-accent to-accent-hover p-7 md:p-8 transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] hover:scale-[1.01]"
      >
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Sword size={28} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-heading font-bold text-white text-xl md:text-2xl">
              {t('createCharacter')}
            </p>
            <p className="text-white/70 text-sm mt-1">
              {t('createCharacterSub')}
            </p>
          </div>
          <ChevronRight
            size={22}
            className="text-white/60 group-hover:translate-x-1 group-hover:text-white transition-all shrink-0"
          />
        </div>
      </Link>

      <Link
        href="/app/guilds/new"
        className="group relative overflow-hidden rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.8)] to-[rgba(10,18,32,0.6)] p-7 md:p-8 transition-all duration-300 hover:border-accent/40 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]"
      >
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Shield size={28} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-heading font-bold text-white text-xl md:text-2xl">
              {t('createGuild')}
            </p>
            <p className="text-muted text-sm mt-1">{t('createGuildSub')}</p>
          </div>
          <ChevronRight
            size={22}
            className="text-muted group-hover:translate-x-1 group-hover:text-accent transition-all shrink-0"
          />
        </div>
      </Link>
    </motion.div>
  );
}

function CharactersSection({
  characters,
  guildById,
  classLabel,
  gameLabel,
  onCreateFirst,
  onJoin,
  onLeave,
  onDelete,
  guildAction,
}: {
  characters: CharacterDoc[];
  guildById: Map<string, GuildDoc>;
  classLabel: (value?: string) => string | undefined;
  gameLabel: (value?: string) => string | undefined;
  onCreateFirst: string;
  onJoin: (character: CharacterDoc) => void;
  onLeave: (character: CharacterDoc) => void;
  onDelete: (character: CharacterDoc) => void;
  guildAction: { characterId: string; busy: boolean; error: string } | null;
}) {
  const t = useTranslations('Dashboard');

  const classOptions = useMemo(() => t.raw('classes') as ClassOption[], [t]);

  const classIcon = (value?: string) =>
    classOptions.find((c) => c.value === value)?.icon;

  return (
    <motion.section variants={fadeUp}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2">
          <Sword size={20} className="text-accent" /> {t('charactersTitle')}
        </h2>
        {characters.length > 0 && (
          <Link
            href="/app/characters/new"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/15 border border-accent/30 text-accent text-xs font-medium hover:bg-accent hover:text-white transition-all duration-200"
          >
            <Plus size={14} /> {t('createCharacter')}
          </Link>
        )}
      </div>

      {characters.length === 0 ? (
        <EmptyState
          icon={<Sword size={28} className="text-accent" />}
          message={t('charactersEmpty')}
          cta={onCreateFirst}
          href="/app/characters/new"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {characters.map((character) => {
            const guild = character.guildId
              ? guildById.get(character.guildId)
              : undefined;
            const isGuildLeader =
              !!guild && guild.ownerCharacterId === character.id;
            const action = guildAction?.characterId === character.id
              ? guildAction
              : null;
            const classIconUrl = classIcon(character.className);
            return (
              <div
                key={character.id}
                className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-5 hover:border-accent/30 transition-all duration-300 group flex flex-col"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent/15 border border-accent/20 flex items-center justify-center font-heading font-bold text-accent text-sm shrink-0 overflow-hidden">
                    {classIconUrl ? (
                      <img
                        src={classIconUrl}
                        alt={character.className ?? ''}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      character.name?.charAt(0) ?? '?'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {character.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted">
                        {t('cp')} {new Intl.NumberFormat('pt-BR').format(character.level ?? 1)}
                      </span>
                      {character.game && (
                        <span className="text-xs px-1.5 py-0.5 rounded text-muted bg-[rgba(38,51,86,0.3)]">
                          {gameLabel(character.game)}
                        </span>
                      )}
                      {character.className && (
                        <span className="text-xs px-1.5 py-0.5 rounded text-accent bg-accent/10">
                          {classLabel(character.className)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Link
                      href={`/app/characters/new?id=${character.id}`}
                      aria-label={t('edit')}
                      title={t('edit')}
                      className="p-2 rounded-lg text-muted hover:text-accent hover:bg-accent/10 transition-colors"
                    >
                      <Pencil size={15} />
                    </Link>
                    <button
                      type="button"
                      aria-label={t('delete')}
                      title={t('delete')}
                      onClick={() => onDelete(character)}
                      className="p-2 rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[rgba(38,51,86,0.3)]">
                  {guild ? (
                    <div className="flex items-center gap-2 mb-3">
                      <Shield size={14} className="text-accent shrink-0" />
                      <span className="text-xs text-muted truncate flex-1">
                        {t('memberOfGuild', { name: guild.name ?? '' })}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded shrink-0 flex items-center gap-1',
                          isGuildLeader
                            ? 'text-yellow-400 bg-yellow-400/10'
                            : 'text-accent bg-accent/10',
                        )}
                      >
                        {isGuildLeader && <Crown size={10} />}
                        {isGuildLeader ? t('leaderRole') : t('memberRole')}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted mb-3 flex items-center gap-2">
                      <Users size={14} className="opacity-60" />
                      {t('noGuild')}
                    </p>
                  )}

                  {action?.error && (
                    <p className="text-xs text-red-400 mb-2">{action.error}</p>
                  )}

                  <div className="flex gap-2">
                    {guild ? (
                      isGuildLeader ? (
                        <Link
                          href={`/panel/guilds/${guild.id}`}
                          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-accent/15 border border-accent/30 text-accent text-xs font-medium hover:bg-accent hover:text-white transition-all duration-200"
                        >
                          <LayoutDashboard size={14} />
                          {t('manageGuild')}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled={action?.busy}
                          onClick={() => onLeave(character)}
                          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/10 transition-all duration-200 disabled:opacity-50"
                        >
                          {action?.busy ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <LogIn size={14} className="rotate-180" />
                          )}
                          {t('leaveGuild')}
                        </button>
                      )
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onJoin(character)}
                          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-all duration-200"
                        >
                          <LogIn size={14} /> {t('joinGuild')}
                        </button>
                        <Link
                          href={`/app/guilds/new?character=${character.id}`}
                          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-accent/10 border border-accent/30 text-accent text-xs font-medium hover:bg-accent/20 transition-all duration-200"
                        >
                          <Shield size={14} /> {t('createGuild')}
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.section>
  );
}

function JoinGuildModal({
  character,
  guilds,
  loading,
  error,
  onClose,
  onJoin,
}: {
  character: CharacterDoc;
  guilds: GuildDoc[];
  loading: boolean;
  error: string;
  onClose: () => void;
  onJoin: (guild: GuildDoc) => void;
}) {
  const t = useTranslations('Dashboard');
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleJoin = async (guild: GuildDoc) => {
    setBusyId(guild.id);
    await onJoin(guild);
    setBusyId(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#0a1122] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(38,51,86,0.5)]">
          <div>
            <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2">
              <LogIn size={18} className="text-accent" /> {t('joinModalTitle')}
            </h2>
            <p className="text-xs text-muted mt-0.5">
              {t('joinModalSub', { name: character.name ?? '' })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-[rgba(38,51,86,0.3)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted">
              <Loader2 size={22} className="animate-spin mr-2" />
              {t('loadingGuilds')}
            </div>
          ) : error ? (
            <p className="text-sm text-red-400 text-center py-8">{error}</p>
          ) : guilds.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">
              {t('noOpenGuilds')}
            </p>
          ) : (
            <div className="space-y-2">
              {guilds.map((guild) => (
                <div
                  key={guild.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-[rgba(38,51,86,0.3)] bg-[rgba(19,29,48,0.4)]"
                >
                  <div className="w-9 h-9 rounded-lg bg-accent/15 border border-accent/20 flex items-center justify-center font-heading font-bold text-accent text-sm shrink-0">
                    {guild.name?.charAt(0) ?? 'G'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">
                      {guild.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {guild.faction && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                          {guild.faction}
                        </span>
                      )}
                      <span className="text-[10px] text-muted flex items-center gap-1">
                        <Users size={10} /> {guild.members?.length ?? 0}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleJoin(guild)}
                    disabled={busyId === guild.id}
                    className="shrink-0 flex items-center gap-1.5 px-3 h-8 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
                  >
                    {busyId === guild.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <LogIn size={13} />
                    )}
                    {t('join')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DeleteCharacterModal({
  character,
  loading,
  error,
  onClose,
  onConfirm,
}: {
  character: CharacterDoc;
  loading: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations('Dashboard');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#0a1122] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(38,51,86,0.5)]">
          <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2">
            <Trash2 size={18} className="text-red-400" />
            {t('deleteModalTitle')}
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-[rgba(38,51,86,0.3)] transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm text-muted">
            {t('deleteModalSub', { name: character.name ?? '' })}
          </p>

          {error && (
            <div className="flex items-center gap-2 p-3 mt-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          <div className="flex gap-2 mt-6">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 h-10 rounded-lg border border-[rgba(38,51,86,0.5)] text-muted text-sm font-medium hover:text-white hover:bg-[rgba(38,51,86,0.2)] transition-colors disabled:opacity-50"
            >
              {t('deleteCancel')}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Trash2 size={15} />
              )}
              {t('deleteConfirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GuildsSection({
  guilds,
  uid,
  onCreateFirst,
}: {
  guilds: GuildDoc[];
  uid?: string;
  onCreateFirst: string;
}) {
  const t = useTranslations('Dashboard');

  return (
    <motion.section variants={fadeUp}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2">
          <Shield size={20} className="text-accent" /> {t('guildsTitle')}
        </h2>
        {guilds.length > 0 && (
          <Link
            href="/app/guilds/new"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/15 border border-accent/30 text-accent text-xs font-medium hover:bg-accent hover:text-white transition-all duration-200"
          >
            <Plus size={14} /> {t('createGuild')}
          </Link>
        )}
      </div>

      {guilds.length === 0 ? (
        <EmptyState
          icon={<Shield size={28} className="text-accent" />}
          message={t('guildsEmpty')}
          cta={onCreateFirst}
          href="/app/guilds/new"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {guilds.map((guild) => {
            const isLeader = guild.ownerId === uid;
            return (
              <div
                key={guild.id}
                className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-5 hover:border-accent/30 hover:bg-[rgba(109,40,217,0.04)] transition-all duration-300 group"
              >
                <Link
                  href={`/panel/guilds/${guild.id}`}
                  className="flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent/15 border border-accent/20 flex items-center justify-center font-heading font-bold text-accent text-sm shrink-0">
                    {guild.name?.charAt(0) ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium truncate">
                        {guild.name}
                      </p>
                      {guild.tag && (
                        <span className="text-xs text-muted truncate">
                          [{guild.tag}]
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted flex items-center gap-1">
                        <Users size={12} />{' '}
                        {t('membersCount', {
                          count: guild.members?.length ?? 0,
                        })}
                      </span>
                      <span
                        className={cn(
                          'text-xs px-1.5 py-0.5 rounded',
                          isLeader
                            ? 'text-yellow-400 bg-yellow-400/10'
                            : 'text-accent bg-accent/10',
                        )}
                      >
                        {isLeader ? t('leaderRole') : t('memberRole')}
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    size={18}
                    className="text-muted group-hover:translate-x-1 group-hover:text-accent transition-all shrink-0"
                  />
                </Link>
                <Link
                  href={`/panel/guilds/${guild.id}`}
                  className="mt-4 flex items-center justify-center gap-2 w-full h-10 rounded-lg bg-accent/15 border border-accent/30 text-accent text-sm font-medium hover:bg-accent hover:text-white transition-all duration-200"
                >
                  <LayoutDashboard size={16} /> {t('openGuildPanel')}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </motion.section>
  );
}

function EmptyState({
  icon,
  message,
  cta,
  href,
}: {
  icon: ReactNode;
  message: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[rgba(38,51,86,0.5)] bg-[rgba(10,18,32,0.3)] p-8 flex flex-col items-center justify-center text-center">
      <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-3">
        {icon}
      </div>
      <p className="text-sm text-muted max-w-xs">{message}</p>
      <Link
        href={href}
        className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors"
      >
        <Plus size={16} /> {cta}
      </Link>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations('Dashboard');

  return (
    <motion.div
      variants={fadeUp}
      className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 flex flex-col items-center justify-center text-center"
    >
      <p className="text-sm text-red-400 max-w-xs">{t('loadError')}</p>
      <button
        onClick={onRetry}
        className="mt-4 px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors"
      >
        {t('retry')}
      </button>
    </motion.div>
  );
}

function SkeletonGrid() {
  return (
    <motion.div variants={fadeUp} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-32 rounded-xl border border-[rgba(38,51,86,0.5)] bg-[rgba(19,29,48,0.4)] animate-pulse" />
        <div className="h-32 rounded-xl border border-[rgba(38,51,86,0.5)] bg-[rgba(19,29,48,0.4)] animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="h-24 rounded-xl border border-[rgba(38,51,86,0.5)] bg-[rgba(19,29,48,0.4)] animate-pulse" />
        <div className="h-24 rounded-xl border border-[rgba(38,51,86,0.5)] bg-[rgba(19,29,48,0.4)] animate-pulse" />
        <div className="h-24 rounded-xl border border-[rgba(38,51,86,0.5)] bg-[rgba(19,29,48,0.4)] animate-pulse" />
      </div>
    </motion.div>
  );
}
