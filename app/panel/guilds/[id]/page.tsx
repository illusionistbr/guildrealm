'use client';

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { onAuthStateChanged } from 'firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/admin/firebase/client';
import { COLLECTIONS } from '@/lib/admin/firebase/collections';
import { cn } from '@/lib/admin/utils/cn';
import { GuildCalendar } from '@/components/guild-calendar/GuildCalendar';
import { GroupsView } from '@/components/guild-groups/GroupsView';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Crown,
  Gamepad2,
  Globe2,
  LayoutDashboard,
  MapPin,
  Menu,
  Shield,
  Swords,
  User,
  Users,
} from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

type Option = { value: string; label: string };
type ClassOption = Option & { icon?: string };

type View = 'overview' | 'calendar' | 'groups' | 'members';

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
  members?: string[];
  memberOwnerIds?: string[];
  ownerCharacterId?: string;
  timezone?: number;
  createdAt?: { seconds: number };
};

type CharacterDoc = {
  id: string;
  ownerId?: string;
  name?: string;
  className?: string;
  game?: string;
  level?: number;
};

type MemberNames = Record<string, string>;
type MemberMeta = Record<string, { className?: string; level?: number }>;

const FACIONS: Record<string, string> = {
  elyos: 'Elyos',
  asmodians: 'Asmodians',
};

export default function GuildPanelPage() {
  const t = useTranslations('GuildPanel');
  const params = useParams<{ id: string }>();

  const [uid, setUid] = useState<string | null>(null);
  const [guild, setGuild] = useState<GuildDoc | null>(null);
  const [memberNames, setMemberNames] = useState<MemberNames>({});
  const [memberMeta, setMemberMeta] = useState<MemberMeta>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const languages = useMemo(() => t.raw('languages') as Option[], [t]);
  const regions = useMemo(() => t.raw('regions') as Option[], [t]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(getFirebaseAuth(), (user) => {
      if (user) setUid(user.uid);
    });

    const db = getFirebaseDb();
    const unsubscribe = onSnapshot(
      doc(db, COLLECTIONS.GUILDS, params.id),
      (snap) => {
        if (snap.exists()) {
          setGuild({ id: snap.id, ...snap.data() } as GuildDoc);
        } else {
          setGuild(null);
        }
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );

    return () => {
      unsubAuth();
      unsubscribe();
    };
  }, [params.id]);

  useEffect(() => {
    if (!guild?.members?.length) return;

    let disposed = false;
    const ids = guild.members;
    const db = getFirebaseDb();

    const load = async () => {
      const names: Record<string, string> = {};
      const meta: Record<string, { className?: string; level?: number }> = {};
      await Promise.all(
        ids.map(async (memberId) => {
          try {
            const charSnap = await getDoc(doc(db, COLLECTIONS.CHARACTERS, memberId));
            if (charSnap.exists()) {
              const data = charSnap.data() as CharacterDoc;
              if (data.name) names[memberId] = data.name;
              meta[memberId] = {
                className: data.className,
                level: data.level,
              };
              return;
            }
          } catch {
            // segue para fallback de usuário
          }
          try {
            const userSnap = await getDoc(doc(db, COLLECTIONS.USERS, memberId));
            if (!disposed && userSnap.exists()) {
              const data = userSnap.data() as { displayName?: string };
              if (data.displayName) names[memberId] = data.displayName;
            }
          } catch {
            // perfil indisponível: exibe fallback
          }
        }),
      );
      if (!disposed) {
        setMemberNames(names);
        setMemberMeta(meta);
      }
    };

    load();
    return () => {
      disposed = true;
    };
  }, [guild?.members]);

  const isLeader = !!uid && guild?.ownerId === uid;

  if (!loading && !guild) {
    return (
      <div className="min-h-screen bg-[#050912] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-14 h-14 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-4">
          <Shield size={22} className="text-accent" />
        </div>
        <p className="text-white font-heading font-semibold">{t('notFound')}</p>
        <Link
          href="/app/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover mt-4 transition-colors"
        >
          <LayoutDashboard size={16} /> {t('backToDashboard')}
        </Link>
      </div>
    );
  }

  const viewTitle =
    view === 'overview'
      ? t('menuOverview')
      : view === 'calendar'
        ? t('menuCalendar')
        : view === 'groups'
          ? t('menuGroups')
          : t('menuMembers');

  return (
    <div className="min-h-screen bg-[#050912] flex">
      <PanelSidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        guild={guild}
        view={view}
        onView={setView}
        isLeader={isLeader}
      />

      <div
        className={cn(
          'flex-1 flex flex-col transition-all duration-300 min-h-screen',
          sidebarOpen ? 'ml-64' : 'ml-16',
        )}
      >
        <PanelHeader
          guild={guild}
          isLeader={isLeader}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main
          className={cn(
            'flex-1 p-6',
            view === 'calendar'
              ? 'overflow-hidden flex flex-col'
              : 'overflow-auto',
          )}
        >
          {loading || !guild ? (
            <div className="h-40 rounded-xl border border-[rgba(38,51,86,0.5)] bg-[rgba(19,29,48,0.4)] animate-pulse" />
          ) : view === 'calendar' ? (
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="mb-4 shrink-0">
                <h1 className="text-2xl md:text-3xl font-heading font-bold text-white">
                  {t('menuCalendar')}{' '}
                  <span className="text-accent">{guild.name}</span>
                </h1>
                <p className="text-muted mt-1">{t('subtitle')}</p>
              </div>
              <GuildCalendar
                guildId={guild.id}
                guildName={guild.name ?? ''}
                uid={uid ?? ''}
                displayName=""
                isLeader={isLeader}
                timezone={guild.timezone ?? -3}
              />
            </div>
          ) : view === 'groups' ? (
            <div>
              <div className="mb-4">
                <h1 className="text-2xl md:text-3xl font-heading font-bold text-white">
                  {t('menuGroups')}{' '}
                  <span className="text-accent">{guild.name}</span>
                </h1>
                <p className="text-muted mt-1">{t('subtitle')}</p>
              </div>
              <GroupsView
                guildId={guild.id}
                memberIds={guild.members ?? []}
                memberNames={memberNames}
                isLeader={isLeader}
              />
            </div>
          ) : (
            <div className="shell">
              <motion.div
                initial="initial"
                animate="animate"
                variants={{
                  animate: { transition: { staggerChildren: 0.05 } },
                }}
                className="space-y-8"
              >
                <motion.div variants={fadeUp}>
                  <h1 className="text-2xl md:text-3xl font-heading font-bold text-white">
                    {viewTitle}{' '}
                    <span className="text-accent">{guild.name}</span>
                  </h1>
                  <p className="text-muted mt-1">{t('subtitle')}</p>
                </motion.div>

                {view === 'overview' && <OverviewView guild={guild} />}

                {view === 'members' && (
                  <MembersView
                    guild={guild}
                    memberNames={memberNames}
                    memberMeta={memberMeta}
                  />
                )}
              </motion.div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function PanelSidebar({
  open,
  onToggle,
  guild,
  view,
  onView,
  isLeader,
}: {
  open: boolean;
  onToggle: () => void;
  guild: GuildDoc | null;
  view: View;
  onView: (view: View) => void;
  isLeader: boolean;
}) {
  const t = useTranslations('GuildPanel');
  const isRecruiting = guild?.recruitment !== 'closed';

  const items: { key: View; icon: ReactNode; label: string }[] = [
    {
      key: 'overview',
      icon: <LayoutDashboard size={20} />,
      label: t('menuOverview'),
    },
    {
      key: 'calendar',
      icon: <CalendarDays size={20} />,
      label: t('menuCalendar'),
    },
    {
      key: 'groups',
      icon: <Swords size={20} />,
      label: t('menuGroups'),
    },
    { key: 'members', icon: <Users size={20} />, label: t('menuMembers') },
  ];

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full bg-[#080f1e] border-r border-[rgba(38,51,86,0.5)] z-30 flex flex-col transition-all duration-300',
        open ? 'w-64' : 'w-16',
      )}
    >
      <div
        className={cn(
          'flex items-center h-16 px-4 border-b border-[rgba(38,51,86,0.5)]',
          open ? 'justify-between' : 'justify-center',
        )}
      >
        {open && (
          <Link href="/app/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <span className="font-heading font-bold text-white text-lg">
              GuildRealm
            </span>
          </Link>
        )}
        <button
          onClick={onToggle}
          className="text-muted hover:text-white transition-colors p-1"
        >
          {open ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      <div className={cn('px-3 pt-4', !open && 'hidden')}>
        <div className="rounded-xl p-3 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg border border-[rgba(38,51,86,0.5)] flex items-center justify-center overflow-hidden shrink-0">
            {guild?.logoUrl ? (
              <img
                src={guild.logoUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-accent/15 flex items-center justify-center font-heading font-bold text-accent text-sm">
                {guild?.name?.charAt(0).toUpperCase() || 'G'}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white font-heading font-bold text-sm truncate">
              {guild?.name ?? '—'}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded font-medium',
                  isRecruiting
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-red-500/10 text-red-400',
                )}
              >
                {isRecruiting ? t('recruiting') : t('closedRecruitment')}
              </span>
              {isLeader && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-400/10 text-yellow-400 flex items-center gap-1">
                  <Crown size={10} /> {t('leader')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1 scrollbar-thin">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => onView(item.key)}
            title={!open ? item.label : undefined}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
              view === item.key
                ? 'bg-accent/15 text-white border border-accent/30'
                : 'text-muted hover:text-white hover:bg-[rgba(109,40,217,0.08)]',
              !open && 'justify-center px-2',
            )}
          >
            <span className={cn(view === item.key && 'text-accent')}>
              {item.icon}
            </span>
            {open && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      <div
        className={cn(
          'p-3 border-t border-[rgba(38,51,86,0.5)]',
          open ? 'px-4' : 'px-2',
        )}
      >
        <Link
          href="/app/dashboard"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted hover:text-white hover:bg-[rgba(109,40,217,0.08)] transition-all duration-200',
            !open && 'justify-center px-2',
          )}
          title={!open ? t('backToDashboard') : undefined}
        >
          <LayoutDashboard size={20} />
          {open && <span>{t('backToDashboard')}</span>}
        </Link>
      </div>
    </aside>
  );
}

function PanelHeader({
  guild,
  isLeader,
  onMenuToggle,
}: {
  guild: GuildDoc | null;
  isLeader: boolean;
  onMenuToggle: () => void;
}) {
  const t = useTranslations('GuildPanel');
  const isRecruiting = guild?.recruitment !== 'closed';

  return (
    <header className="h-16 border-b border-[rgba(38,51,86,0.5)] bg-[#080f1e]/80 backdrop-blur-md flex items-center justify-between px-6 gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={onMenuToggle}
          className="text-muted hover:text-white transition-colors p-1 shrink-0"
        >
          <Menu size={20} />
        </button>
        <p className="text-white font-heading font-bold truncate">
          {guild?.name ?? '—'}
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span
          className={cn(
            'hidden md:inline-flex text-xs px-2 py-1 rounded-lg font-medium',
            isRecruiting
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-red-500/10 text-red-400',
          )}
        >
          {isRecruiting ? t('recruiting') : t('closedRecruitment')}
        </span>
        {isLeader && (
          <span className="hidden md:flex text-xs px-2 py-1 rounded bg-yellow-400/10 text-yellow-400 items-center gap-1">
            <Crown size={12} /> {t('leader')}
          </span>
        )}
        <Link
          href="/app/dashboard"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgba(38,51,86,0.5)] text-muted text-xs hover:text-white hover:border-accent/30 transition-all"
        >
          <LayoutDashboard size={14} /> {t('backToDashboard')}
        </Link>
      </div>
    </header>
  );
}

function OverviewView({ guild }: { guild: GuildDoc }) {
  const t = useTranslations('GuildPanel');

  return (
    <>
      <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.8)] to-[rgba(10,18,32,0.6)] p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#0a1122] flex items-center justify-center overflow-hidden shrink-0">
            {guild.logoUrl ? (
              <img
                src={guild.logoUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-accent/15 flex items-center justify-center font-heading font-bold text-accent text-xl">
                {guild.name?.charAt(0).toUpperCase() || 'G'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-heading font-bold text-lg truncate">
              {guild.name}
            </p>
            <span
              className={cn(
                'inline-flex mt-1 text-xs px-2 py-0.5 rounded-lg font-medium',
                guild.recruitment === 'open'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20',
              )}
            >
              {guild.recruitment === 'open'
                ? t('recruiting')
                : t('closedRecruitment')}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted">
            <Users size={16} />
            {t('membersCount', { count: guild.members?.length ?? 0 })}
          </div>
        </div>
      </div>

      <InfoSection guild={guild} />
    </>
  );
}

function InfoSection({ guild }: { guild: GuildDoc }) {
  const t = useTranslations('GuildPanel');
  const languages = useMemo(() => t.raw('languages') as Option[], [t]);
  const regions = useMemo(() => t.raw('regions') as Option[], [t]);

  const regionLabel = regions.find((r) => r.value === guild.region)?.label;
  const languageLabels = languages
    .filter((l) => guild.languages?.includes(l.value))
    .map((l) => l.label);

  return (
    <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-6">
      <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2 mb-4">
        <Globe2 size={18} className="text-accent" /> {t('infoTitle')}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InfoItem
          icon={<Gamepad2 size={15} className="text-accent" />}
          label={t('gameLabel')}
          value="Aion 2"
        />
        <InfoItem
          icon={<Shield size={15} className="text-accent" />}
          label={t('factionLabel')}
          value={guild.faction ? FACIONS[guild.faction] : '—'}
        />
        <InfoItem
          icon={<MapPin size={15} className="text-accent" />}
          label={t('regionLabel')}
          value={regionLabel ?? '—'}
        />
        <InfoItem
          icon={<Users size={15} className="text-accent" />}
          label={t('recruitmentLabel')}
          value={
            guild.recruitment === 'open'
              ? t('recruiting')
              : t('closedRecruitment')
          }
        />
        <div className="sm:col-span-2">
          <p className="text-xs text-muted mb-2 flex items-center gap-1.5">
            <Globe2 size={14} className="text-accent" />
            {t('languagesLabel')}
          </p>
          {languageLabels.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {languageLabels.map((label) => (
                <span
                  key={label}
                  className="text-xs px-2 py-1 rounded-lg bg-[rgba(38,51,86,0.3)] text-muted"
                >
                  {label}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">—</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MembersView({
  guild,
  memberNames,
  memberMeta,
}: {
  guild: GuildDoc;
  memberNames: MemberNames;
  memberMeta: MemberMeta;
}) {
  const t = useTranslations('GuildPanel');
  const classOptions = useMemo(() => t.raw('classes') as ClassOption[], [t]);

  return (
    <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-6">
      <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2 mb-4">
        <Users size={18} className="text-accent" /> {t('membersTitle')}
      </h2>
      <div className="space-y-2">
        {(guild.members ?? []).map((memberId) => {
          const isLeader = memberId === guild.ownerCharacterId;
          const displayName = memberNames[memberId] ?? memberId.slice(0, 8);
          const meta = memberMeta[memberId];
          const classOption = classOptions.find(
            (c) => c.value === meta?.className,
          );
          return (
            <div
              key={memberId}
              className="flex items-center gap-3 p-3 rounded-lg border border-[rgba(38,51,86,0.3)] bg-[rgba(10,18,32,0.4)]"
            >
              <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/20 flex items-center justify-center overflow-hidden shrink-0">
                {classOption?.icon ? (
                  <img
                    src={classOption.icon}
                    alt={classOption.label}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={15} className="text-accent" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">
                  {displayName}
                </p>
                <p className="text-xs text-muted truncate">
                  {classOption?.label ??
                    (meta?.className ? meta.className : t('memberRole'))}
                  {meta?.level != null && ` • ${t('level')} ${meta.level}`}
                </p>
              </div>
              {isLeader && (
                <span className="text-xs px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-400 flex items-center gap-1 shrink-0">
                  <Crown size={12} /> {t('leader')}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InfoItem({
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
