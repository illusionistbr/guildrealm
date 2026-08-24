'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { collection, onSnapshot } from 'firebase/firestore';
import {
  Shield,
  Users,
  ChevronRight,
  Search,
  Swords,
  Gamepad2,
  Globe2,
  Plus,
  Loader2,
} from 'lucide-react';
import { getFirebaseDb } from '@/lib/admin/firebase/client';
import { COLLECTIONS } from '@/lib/admin/firebase/collections';
import { cn } from '@/lib/admin/utils/cn';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

type GuildDoc = {
  id: string;
  name?: string;
  game?: string;
  region?: string;
  languages?: string[];
  recruitment?: 'open' | 'closed';
  members?: string[];
  ownerName?: string | null;
  ownerCharacterName?: string | null;
  logoUrl?: string | null;
  createdAt?: { seconds: number };
};

const gameLabels: Record<string, string> = {
  aion2: 'Aion 2',
  tl: 'Throne and Liberty',
};

export default function GuildsPage() {
  const [guilds, setGuilds] = useState<GuildDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(
      collection(getFirebaseDb(), COLLECTIONS.GUILDS),
      (snap) => {
        const list: GuildDoc[] = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }) as GuildDoc);
        list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
        setGuilds(list);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return guilds;
    return guilds.filter((g) => (g.name ?? '').toLowerCase().includes(q));
  }, [guilds, search]);

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{ animate: { transition: { staggerChildren: 0.05 } } }}
      className="space-y-6"
    >
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">Guildas</h1>
          <p className="text-muted mt-1">
            Explore todas as guildas cadastradas no ClanForge. {filtered.length} encontrada{filtered.length !== 1 ? 's' : ''}.
          </p>
        </div>
        <Link
          href="/app/guilds/new"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors self-start sm:self-auto"
        >
          <Plus size={16} /> Criar guilda
        </Link>
      </motion.div>

      <motion.div variants={fadeUp} className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          placeholder="Buscar guildas por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-9 pr-3 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
        />
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-5 animate-pulse h-[154px]"
            >
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-xl bg-[rgba(38,51,86,0.3)]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-[rgba(38,51,86,0.3)]" />
                  <div className="h-3 w-20 rounded bg-[rgba(38,51,86,0.2)]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div variants={fadeUp} className="text-center py-16 rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)]">
          <Swords size={36} className="text-accent mx-auto mb-4" />
          <p className="text-white font-medium">
            {guilds.length === 0 ? 'Nenhuma guilda cadastrada ainda.' : 'Nenhuma guilda encontrada.'}
          </p>
          <p className="text-muted text-sm mt-1">
            {guilds.length === 0
              ? 'Seja o primeiro a criar uma guilda no ClanForge.'
              : 'Tente outro termo de busca.'}
          </p>
          {guilds.length === 0 && (
            <Link
              href="/app/guilds/new"
              className="inline-flex items-center gap-2 mt-4 h-9 px-4 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover transition-colors"
            >
              <Plus size={16} /> Criar guilda
            </Link>
          )}
        </motion.div>
      ) : (
        <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((g) => {
            const isRecruiting = g.recruitment !== 'closed';
            const gameLabel = g.game ? gameLabels[g.game] ?? g.game : '—';
            return (
              <Link
                key={g.id}
                href={`/guilds/${g.id}`}
                className={cn(
                  'rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-5 hover:border-accent/30 transition-all duration-300 group flex flex-col',
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-accent/15 border border-accent/20 flex items-center justify-center font-bold text-lg text-accent shrink-0 overflow-hidden">
                      {g.logoUrl ? (
                        <img src={g.logoUrl} alt={g.name} className="w-full h-full object-cover" />
                      ) : (
                        (g.name?.charAt(0) ?? '?').toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">{g.name ?? 'Sem nome'}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted flex items-center gap-1">
                          <Users size={12} /> {g.members?.length ?? 0} membros
                        </span>
                        <span className="text-xs text-muted hidden sm:inline">•</span>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full', isRecruiting ? 'text-emerald-300 bg-emerald-400/10 border border-emerald-400/20' : 'text-red-300 bg-red-400/10 border border-red-400/20')}>
                          {isRecruiting ? 'Recrutando' : 'Fechado'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-muted group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0" />
                </div>
                <div className="flex items-center gap-3 text-xs text-muted mt-1 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Gamepad2 size={12} /> {gameLabel}
                  </span>
                  {g.region && (
                    <span className="flex items-center gap-1">
                      <Globe2 size={12} /> {g.region}
                    </span>
                  )}
                  {(g.ownerCharacterName || g.ownerName) && (
                    <span className="truncate">Líder: {g.ownerCharacterName ?? g.ownerName}</span>
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  <span className="flex-1 h-8 flex items-center justify-center rounded-lg border border-[rgba(38,51,86,0.5)] text-xs text-muted group-hover:text-white group-hover:border-accent/30 transition-colors">
                    Ver guilda
                  </span>
                  <span className="flex-1 h-8 flex items-center justify-center rounded-lg bg-accent text-white text-xs group-hover:bg-accent-hover transition-colors">
                    Candidatar-se
                  </span>
                </div>
              </Link>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
