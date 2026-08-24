'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot } from 'firebase/firestore';
import {
  ChevronDown,
  Gamepad2,
  Globe2,
  Plus,
  Search,
  ShieldCheck,
  Swords,
  UsersRound,
} from 'lucide-react';
import { PrimaryButton } from '@/components/ui/primary-button';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/admin/firebase/client';
import { COLLECTIONS } from '@/lib/admin/firebase/collections';

type Option = { value: string; label: string };

type GuildDoc = {
  id: string;
  ownerId?: string;
  ownerName?: string | null;
  ownerCharacterName?: string | null;
  name?: string;
  game?: string;
  faction?: string;
  recruitment?: 'open' | 'closed';
  region?: string;
  languages?: string[];
  logoUrl?: string | null;
  members?: string[];
  createdAt?: { seconds: number };
};

type Filters = {
  search: string;
  game: string;
  region: string;
  recruitment: string;
};

export default function AppGuildsCataloguePage() {
  const t = useTranslations('Guilds');
  const games = useMemo(() => t.raw('games') as Option[], [t]);
  const regions = useMemo(() => t.raw('regions') as Option[], [t]);
  const languages = useMemo(() => t.raw('languages') as Option[], [t]);

  const [guilds, setGuilds] = useState<GuildDoc[]>([]);
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    game: 'all',
    region: 'all',
    recruitment: 'all',
  });

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(getFirebaseAuth(), (user) => {
      setUid(user?.uid ?? null);
    });

    const unsubscribe = onSnapshot(
      collection(getFirebaseDb(), COLLECTIONS.GUILDS),
      (snap) => {
        const list: GuildDoc[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as GuildDoc));
        list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
        setGuilds(list);
        setLoading(false);
      },
      () => setLoading(false),
    );

    return () => {
      unsubAuth();
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!uid) return;
    let disposed = false;
    const needed = [
      ...new Set(
        guilds.filter((g) => !g.ownerName && g.ownerId).map((g) => g.ownerId as string),
      ),
    ].filter((id) => !ownerNames[id]);
    if (needed.length === 0) return;
    const db = getFirebaseDb();
    const load = async () => {
      const names: Record<string, string> = {};
      await Promise.all(
        needed.map(async (ownerId) => {
          try {
            const snap = await getDoc(doc(db, COLLECTIONS.USERS, ownerId));
            if (snap.exists()) {
              const data = snap.data() as { displayName?: string };
              if (data.displayName) names[ownerId] = data.displayName;
            }
          } catch {}
        }),
      );
      if (!disposed) setOwnerNames((prev) => ({ ...prev, ...names }));
    };
    load();
    return () => {
      disposed = true;
    };
  }, [uid, guilds, ownerNames]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return guilds.filter((g) => {
      if (q && !(g.name ?? '').toLowerCase().includes(q)) return false;
      if (filters.game !== 'all' && g.game !== filters.game) return false;
      if (filters.region !== 'all' && g.region !== filters.region) return false;
      if (filters.recruitment !== 'all' && g.recruitment !== filters.recruitment) return false;
      return true;
    });
  }, [guilds, filters]);

  const gameLabel = (value?: string) => games.find((g) => g.value === value)?.label ?? '—';
  const regionLabel = (value?: string) => regions.find((r) => r.value === value)?.label ?? '—';
  const recruitmentOptions: Option[] = [
    { value: 'all', label: t('filterAnyRecruitment') },
    { value: 'open', label: t('recruiting') },
    { value: 'closed', label: t('closedRecruitment') },
  ];

  return (
    <main className="guilds-page">
        <section className="catalogue-hero">
          <div className="catalogue-art" />
          <div className="shell catalogue-heading">
            <div>
              <p className="catalogue-kicker">
                <ShieldCheck /> {t('heroEyebrow')}
              </p>
              <h1>
                {t('heroTitle1')} <em>{t('heroTitle2')}</em>
              </h1>
              <p>{t('heroText')}</p>
            </div>
            <PrimaryButton className="create-guild" href="/app/guilds/new">
              <Plus size={19} /> {t('createGuild')}
            </PrimaryButton>
          </div>
        </section>
        <section className="shell catalogue-content">
          <div className="filter-panel">
            <label className="search-field">
              <Search size={21} />
              <input
                placeholder={t('searchPlaceholder')}
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              />
            </label>
            <div className="filter-row">
              <FilterSelect
                label={t('filterGame')}
                value={filters.game}
                onChange={(value) => setFilters((prev) => ({ ...prev, game: value }))}
                options={[{ value: 'all', label: t('filterAnyGame') }, ...games]}
              />
              <FilterSelect
                label={t('filterRegion')}
                value={filters.region}
                onChange={(value) => setFilters((prev) => ({ ...prev, region: value }))}
                options={[{ value: 'all', label: t('filterAnyRegion') }, ...regions]}
              />
              <FilterSelect
                label={t('filterRecruitment')}
                value={filters.recruitment}
                onChange={(value) => setFilters((prev) => ({ ...prev, recruitment: value }))}
                options={recruitmentOptions}
              />
            </div>
          </div>

          <div className="results-toolbar">
            <p>{t('resultsFound', { count: filtered.length })}</p>
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
              <p className="text-[#c0c9df] font-medium">{t('noGuilds')}</p>
              <Link
                href="/app/guilds/new"
                className="inline-flex items-center gap-2 mt-4 text-[#a864ff] hover:text-[#c39dff] text-sm transition-colors"
              >
                <Plus size={16} /> {t('createGuild')}
              </Link>
            </div>
          ) : (
            <div className="guild-grid">
              {filtered.map((guild, index) => {
                const gmName = guild.ownerCharacterName ?? guild.ownerName ?? ownerNames[guild.ownerId ?? ''];
                const languageLabels = (guild.languages ?? [])
                  .map((v) => languages.find((l) => l.value === v)?.label)
                  .filter(Boolean) as string[];
                const isRecruiting = guild.recruitment !== 'closed';
                return (
                  <motion.article
                    key={guild.id}
                    className="guild-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="guild-art">
                      <span>
                        <Gamepad2 size={13} /> {gameLabel(guild.game)}
                      </span>
                    </div>
                    <div className="guild-body">
                      <div className="guild-symbol">
                        <ShieldCheck />
                      </div>
                      <span className={`recruitment ${isRecruiting ? 'open' : 'closed'}`}>
                        {isRecruiting ? t('recruiting') : t('closedRecruitment')}
                      </span>
                      <h2>{guild.name}</h2>
                      <p className="guild-meta">
                        <Gamepad2 size={14} /> {gameLabel(guild.game)}
                        <i />
                        <Globe2 size={14} /> {regionLabel(guild.region)}
                        {gmName && (
                          <>
                            <i />
                            {t('gmLabel', { name: gmName })}
                          </>
                        )}
                      </p>
                      <p className="guild-members">
                        <UsersRound size={15} /> {t('members', { count: guild.members?.length ?? 0 })}
                      </p>
                      {languageLabels.length > 0 && (
                        <div className="guild-tags">
                          {languageLabels.map((label) => (
                            <span key={label}>{label}</span>
                          ))}
                        </div>
                      )}
                      <div className="guild-actions">
                        <Link href={`/guilds/${guild.id}`}>{t('viewGuild')}</Link>
                        <Link href={`/guilds/${guild.id}`}>{t('apply')}</Link>
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

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
}) {
  return (
    <label className="select-filter">
      <span>{label}</span>
      <div className="filter-select">
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown size={17} />
      </div>
    </label>
  );
}
