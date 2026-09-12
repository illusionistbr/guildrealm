'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  ChevronDown,
  Crown,
  Gamepad2,
  Globe2,
  Plus,
  Search,
  ShieldCheck,
  Swords,
  UsersRound,
} from 'lucide-react';
import { PrimaryButton } from '@/components/ui/primary-button';
import { getFirebaseApp, getFirebaseAuth, getFirebaseDb } from '@/lib/admin/firebase/client';
import { COLLECTIONS } from '@/lib/admin/firebase/collections';

export type CommunityDoc = {
  id: string;
  ownerId?: string;
  ownerName?: string | null;
  name?: string;
  description?: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  region?: string;
  guildIds?: string[];
  createdAt?: { seconds: number };
};

type GuildMini = {
  id: string;
  name?: string;
  game?: string;
  membersCount?: number;
};

const REGION_LABELS: Record<string, string> = {
  global: 'Global',
  na: 'América do Norte',
  sa: 'América do Sul',
  europe: 'Europa',
  asia: 'Ásia',
  africa: 'África',
  oceania: 'Oceania',
};

const GAME_FILTERS = [
  { value: 'all', label: 'Todos os jogos' },
  { value: 'aion2', label: 'Aion 2' },
];

export default function AppCommunitiesCataloguePage() {
  const [communities, setCommunities] = useState<CommunityDoc[]>([]);
  const [guildsById, setGuildsById] = useState<Record<string, GuildMini>>({});
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [game, setGame] = useState('all');

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(getFirebaseAuth(), (user) => {
      setUid(user?.uid ?? null);
    });

    const db = getFirebaseDb();
    const unsubCommunities = onSnapshot(
      collection(db, COLLECTIONS.COMMUNITIES),
      (snap) => {
        const list: CommunityDoc[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as CommunityDoc));
        list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
        setCommunities(list);
        setLoading(false);
      },
      () => setLoading(false),
    );

    // Mapa de guilds para exibir jogos/qtd por comunidade
    const unsubGuilds = onSnapshot(
      collection(db, COLLECTIONS.GUILDS),
      (snap) => {
        const map: Record<string, GuildMini> = {};
        snap.forEach((d) => {
          const data = d.data() as { name?: string; game?: string; members?: unknown };
          map[d.id] = {
            id: d.id,
            name: data.name,
            game: data.game,
            membersCount: Array.isArray(data.members) ? data.members.length : 0,
          };
        });
        setGuildsById(map);
      },
      () => {},
    );

    return () => {
      unsubAuth();
      unsubCommunities();
      unsubGuilds();
    };
  }, []);

  useEffect(() => {
    if (!uid) return;
    let disposed = false;
    const needed = [
      ...new Set(
        communities.filter((c) => !c.ownerName && c.ownerId).map((c) => c.ownerId as string),
      ),
    ].filter((id) => !ownerNames[id]);
    if (needed.length === 0) return;
    const load = async () => {
      // Nomes via callable (só displayNames — nunca lê users/ no cliente).
      try {
        const fn = httpsCallable<{ uids: string[] }, { names: Record<string, string> }>(
          getFunctions(getFirebaseApp()),
          'getOwnerDisplayNames',
        );
        const res = await fn({ uids: needed });
        if (!disposed && res.data?.names) {
          setOwnerNames((prev) => ({ ...prev, ...res.data.names }));
        }
      } catch {}
    };
    load();
    return () => {
      disposed = true;
    };
  }, [uid, communities, ownerNames]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return communities.filter((c) => {
      if (q) {
        const hay = `${c.name ?? ''} ${c.description ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (game !== 'all') {
        const ids = c.guildIds ?? [];
        const hasGame = ids.some((gid) => guildsById[gid]?.game === game);
        if (!hasGame) return false;
      }
      return true;
    });
  }, [communities, search, game, guildsById]);

  return (
    <main className="guilds-page">
      <section className="catalogue-hero">
        <div className="catalogue-art" />
        <div className="shell catalogue-heading">
          <div>
            <p className="catalogue-kicker">
              <ShieldCheck /> Clãs multijogos
            </p>
            <h1>
              Encontre sua <em>comunidade</em>
            </h1>
            <p>Comunidades agregam as guilds do mesmo clã em vários jogos. Encontre a sua ou crie a do seu clã.</p>
          </div>
          <PrimaryButton className="create-guild" href="/app/communities/new">
            <Plus size={19} /> Criar Comunidade
          </PrimaryButton>
        </div>
      </section>
      <section className="shell catalogue-content">
        <div className="filter-panel">
          <label className="search-field">
            <Search size={21} />
            <input
              placeholder="Buscar comunidade por nome ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="filter-row">
            <label className="select-filter">
              <span>Jogo das guilds</span>
              <div className="filter-select">
                <select value={game} onChange={(e) => setGame(e.target.value)}>
                  {GAME_FILTERS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={17} />
              </div>
            </label>
          </div>
        </div>

        <div className="results-toolbar">
          <p>{filtered.length} {filtered.length === 1 ? 'comunidade encontrada' : 'comunidades encontradas'}</p>
        </div>

        {loading ? (
          <div className="guild-grid">
            {[0, 1, 2].map((i) => (
              <div key={i} className="guild-card h-72 animate-pulse" style={{ opacity: 0.6 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Swords size={36} className="text-accent mx-auto mb-4" />
            <p className="text-[#c0c9df] font-medium">Nenhuma comunidade encontrada</p>
            <Link
              href="/app/communities/new"
              className="inline-flex items-center gap-2 mt-4 text-[#a864ff] hover:text-[#c39dff] text-sm transition-colors"
            >
              <Plus size={16} /> Criar a primeira
            </Link>
          </div>
        ) : (
          <div className="guild-grid">
            {filtered.map((community, index) => {
              const ownerName = community.ownerName ?? ownerNames[community.ownerId ?? ''];
              const guildIds = community.guildIds ?? [];
              const games = [...new Set(guildIds.map((gid) => guildsById[gid]?.game).filter(Boolean))] as string[];
              const totalMembers = guildIds.reduce((sum, gid) => sum + (guildsById[gid]?.membersCount ?? 0), 0);
              const regionLabel = (community.region && REGION_LABELS[community.region]) || null;
              return (
                <motion.article
                  key={community.id}
                  className="guild-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="guild-art">
                    {community.bannerUrl ? (
                      <img
                        src={community.bannerUrl}
                        alt=""
                        className="guild-art-banner"
                      />
                    ) : null}
                    <span>
                      <Gamepad2 size={13} /> {games.length > 0 ? `${games.length} ${games.length === 1 ? 'jogo' : 'jogos'}` : 'Multijogos'}
                    </span>
                  </div>
                  <div className="guild-body">
                    <div className="guild-symbol">
                      {community.logoUrl ? (
                        <img
                          src={community.logoUrl}
                          alt={community.name ?? ''}
                          className="guild-symbol-logo"
                        />
                      ) : (
                        <ShieldCheck />
                      )}
                    </div>
                    <h2>{community.name}</h2>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {regionLabel && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                          <Globe2 size={12} /> {regionLabel}
                        </span>
                      )}
                      {ownerName && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          <Crown size={12} /> GM: {ownerName}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                        <ShieldCheck size={12} /> {guildIds.length} {guildIds.length === 1 ? 'guild' : 'guilds'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        <UsersRound size={12} /> {totalMembers} {totalMembers === 1 ? 'membro' : 'membros'}
                      </span>
                    </div>
                    <div className="guild-actions">
                      <Link href={`/app/communities/${community.id}`}>Ver comunidade</Link>
                      <Link href={`/app/communities/${community.id}`}>Ver guilds</Link>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
