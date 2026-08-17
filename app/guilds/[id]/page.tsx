'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/admin/firebase/client';
import { COLLECTIONS } from '@/lib/admin/firebase/collections';
import { cn } from '@/lib/admin/utils/cn';
import {
  ChevronLeft,
  MapPin,
  Globe2,
  Gamepad2,
  Shield,
  Users,
} from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

type Option = { value: string; label: string };

type GuildDoc = {
  id: string;
  ownerId?: string;
  name?: string;
  game?: string;
  faction?: string;
  recruitment?: 'open' | 'closed';
  region?: string;
  languages?: string[];
  logoUrl?: string | null;
  bannerUrl?: string | null;
  description?: string;
  focus?: string;
  mentality?: string;
  members?: string[];
  createdAt?: { seconds: number };
};

const FACIONS: Record<string, string> = {
  elyos: 'Elyos',
  asmodians: 'Asmodians',
};

const FOCUS_LABELS: Record<string, string> = {
  pvp: 'PvP',
  pve: 'PvE',
  pvpve: 'PvPvE',
  rp: 'RP',
};

const MENTALITY_LABELS: Record<string, string> = {
  hardcore: 'Hardcore',
  semi_hardcore: 'Semi-hardcore',
  casual: 'Casual',
};

export default function PublicGuildPage() {
  const t = useTranslations('GuildPage');
  const params = useParams<{ id: string }>();

  const [guild, setGuild] = useState<GuildDoc | null>(null);
  const [recruitmentOpen, setRecruitmentOpen] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const regions = useMemo(() => t.raw('regions') as Option[], [t]);
  const languages = useMemo(() => t.raw('languages') as Option[], [t]);

  useEffect(() => {
    let disposed = false;
    const load = async () => {
      try {
        const snap = await getDoc(
          doc(getFirebaseDb(), COLLECTIONS.GUILDS, params.id),
        );
        if (!disposed && snap.exists()) {
          setGuild({ id: snap.id, ...snap.data() } as GuildDoc);
        }
        try {
          const settingsSnap = await getDoc(
            doc(
              getFirebaseDb(),
              COLLECTIONS.GUILDS,
              params.id,
              'settings',
              'recruitment',
            ),
          );
          if (settingsSnap.exists()) {
            const data = settingsSnap.data();
            if (!disposed && typeof data.enabled === 'boolean') {
              setRecruitmentOpen(data.enabled);
            }
          }
        } catch {
          // sem acesso ou sem settings: cai no fallback do campo legado
        }
      } finally {
        if (!disposed) setLoading(false);
      }
    };
    load();
    return () => {
      disposed = true;
    };
  }, [params.id]);

  const regionLabel = regions.find((r) => r.value === guild?.region)?.label;
  const languageLabels = languages
    .filter((l) => guild?.languages?.includes(l.value))
    .map((l) => l.label);

  if (!loading && !guild) {
    return (
      <div className="min-h-screen bg-[#050912] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
            <Shield size={22} className="text-accent" />
          </div>
          <p className="text-white font-heading font-semibold">
            {t('notFound')}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover mt-4 transition-colors"
          >
            <ChevronLeft size={16} /> {t('backToHome')}
          </Link>
        </div>
      </div>
    );
  }

  if (loading || !guild) {
    return (
      <div className="min-h-screen bg-[#050912] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  const isRecruiting =
    recruitmentOpen === null
      ? guild.recruitment !== 'closed'
      : recruitmentOpen;

  return (
    <div className="min-h-screen bg-[#050912]">
      <div className="shell py-10">
        <Link
          href="/guilds"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-white transition-colors mb-8"
        >
          <ChevronLeft size={18} /> {t('backToHome')}
        </Link>

        <motion.div
          initial="initial"
          animate="animate"
          variants={{ animate: { transition: { staggerChildren: 0.06 } } }}
          className="max-w-3xl mx-auto"
        >
          <motion.div
            variants={fadeUp}
            className="rounded-xl overflow-hidden border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.8)] to-[rgba(10,18,32,0.6)]"
          >
            <div className="h-40 relative border-b border-[rgba(38,51,86,0.3)]">
              {guild.bannerUrl ? (
                <img
                  src={guild.bannerUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-accent/25 via-accent/10 to-transparent" />
              )}
            </div>
            <div className="px-6 pb-8 -mt-12">
              <div className="flex items-end gap-4">
                <div className="w-24 h-24 rounded-2xl border-4 border-[#0a1122] bg-[#0a1122] flex items-center justify-center overflow-hidden shrink-0">
                  {guild.logoUrl ? (
                    <img
                      src={guild.logoUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-accent/15 flex items-center justify-center font-heading font-bold text-accent text-3xl">
                      {guild.name?.charAt(0).toUpperCase() || 'G'}
                    </div>
                  )}
                </div>
                <div className="pb-1 min-w-0">
                  <h1 className="text-2xl md:text-3xl font-heading font-bold text-white truncate">
                    {guild.name}
                  </h1>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent">
                      {guild.faction ? FACIONS[guild.faction] : ''}
                    </span>
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        isRecruiting
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-red-500/10 text-red-400',
                      )}
                    >
                      {isRecruiting ? t('recruiting') : t('closedRecruitment')}
                    </span>
                    {guild.focus && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(38,51,86,0.4)] text-white">
                        {t('focusLabel')}: {FOCUS_LABELS[guild.focus]}
                      </span>
                    )}
                    {guild.mentality && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(38,51,86,0.4)] text-white">
                        {t('mentalityLabel')}: {MENTALITY_LABELS[guild.mentality]}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {guild.description && (
                <p className="mt-4 text-sm text-muted leading-relaxed">
                  {guild.description}
                </p>
              )}

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <InfoTile
                  icon={<Gamepad2 size={15} className="text-accent" />}
                  label={t('gameLabel')}
                  value="Aion 2"
                />
                <InfoTile
                  icon={<MapPin size={15} className="text-accent" />}
                  label={t('regionLabel')}
                  value={regionLabel ?? '—'}
                />
                <InfoTile
                  icon={<Globe2 size={15} className="text-accent" />}
                  label={t('languagesLabel')}
                  value={
                    languageLabels.length > 0
                      ? languageLabels.slice(0, 3).join(', ')
                      : '—'
                  }
                />
              </div>

              <div className="mt-6 pt-5 border-t border-[rgba(38,51,86,0.3)] flex items-center justify-between">
                <span className="text-sm text-muted flex items-center gap-1.5">
                  <Users size={15} />
                  {t('membersCount', { count: guild.members?.length ?? 0 })}
                </span>
                <span className="text-xs text-yellow-400 px-2 py-0.5 rounded bg-yellow-400/10">
                  {t('leader')}
                </span>
              </div>

              <Link
                href={`/guilds/${guild.id}/recruitment`}
                className="mt-5 w-full h-11 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors flex items-center justify-center gap-2"
              >
                <Shield size={16} /> {t('apply')}
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[rgba(38,51,86,0.5)] bg-[rgba(10,18,32,0.4)] p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
        {icon} {label}
      </div>
      <p className="text-sm text-white font-medium truncate">{value}</p>
    </div>
  );
}
