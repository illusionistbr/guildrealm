'use client';

import {
  useEffect,
  useMemo,
  useRef,
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
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from 'firebase/storage';
import {
  getFirebaseApp,
  getFirebaseAuth,
  getFirebaseDb,
  getFirebaseStorage,
} from '@/lib/admin/firebase/client';
import { COLLECTIONS } from '@/lib/admin/firebase/collections';
import { cn } from '@/lib/admin/utils/cn';
import { GuildCalendar } from '@/components/guild-calendar/GuildCalendar';
import { AttendanceView } from '@/components/guild-attendance/AttendanceView';
import { GroupsView } from '@/components/guild-groups/GroupsView';
import { ConfirmDialog } from '@/components/guild-groups/ConfirmDialog';
import { RanksTab } from '@/components/guild-settings/RanksTab';
import { RecruitmentSettings } from '@/components/guild-settings/RecruitmentSettings';
import { ApplicationsView } from '@/components/guild-settings/ApplicationsView';
import { DiscordSettings } from '@/components/guild-settings/DiscordSettings';
import { DEFAULT_ROLES, type GuildRank } from '@/lib/groups/types';
import { useGuildRanks, useRecruitmentSettings } from '@/lib/groups/hooks';
import {
  AlertTriangle,
  Ban,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Crown,
  Gamepad2,
  Globe2,
  ImagePlus,
  LayoutDashboard,
  Loader2,
  MapPin,
  Menu,
  Search,
  Settings,
  Shield,
  Swords,
  User,
  UserCheck,
  UserMinus,
  UserX,
  Users,
  X,
} from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

type Option = { value: string; label: string };
type ClassOption = Option & { icon?: string };

type View = 'overview' | 'calendar' | 'attendance' | 'groups' | 'members' | 'applications' | 'settings';

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
  memberRoles?: Record<string, string>;
  officerCharacters?: string[];
  inactiveCharacters?: string[];
  bannedCharacters?: string[];
  description?: string;
  focus?: string;
  mentality?: string;
  bannerUrl?: string | null;
  memberRanks?: Record<string, string>;
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
  role?: string;
};

type MemberNames = Record<string, string>;
type MemberMeta = Record<
  string,
  { className?: string; level?: number; role?: string; ownerId?: string }
>;

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
      const meta: Record<
        string,
        { className?: string; level?: number; role?: string; ownerId?: string }
      > = {};
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
                role: data.role,
                ownerId: data.ownerId,
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

  const memberMetaRoles = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [id, meta] of Object.entries(memberMeta)) {
      if (meta.role) out[id] = meta.role;
    }
    return out;
  }, [memberMeta]);

  const { ranks: guildRanks } = useGuildRanks(guild?.id ?? null);
  const { settings: recruitmentSettings } = useRecruitmentSettings(
    guild?.id ?? null,
  );
  const recruitmentOpen = recruitmentSettings?.enabled ?? null;

  const leaderRankId = useMemo(
    () => guildRanks.find((r) => r.isDefault && r.position === 0)?.id ?? null,
    [guildRanks],
  );
  const defaultRankId = useMemo(() => {
    const sorted = [...guildRanks]
      .filter((r) => r.isDefault)
      .sort((a, b) => b.position - a.position);
    return sorted[0]?.id ?? null;
  }, [guildRanks]);

  const userRankId = useMemo(() => {
    if (!guild || !uid) return null;
    if (guild.ownerId === uid) return leaderRankId;
    const memberRanks = guild.memberRanks ?? {};
    const myChars = (guild.members ?? []).filter(
      (id) => memberMeta[id]?.ownerId === uid,
    );
    let best: { id: string; pos: number } | null = null;
    for (const cid of myChars) {
      const rid = memberRanks[cid] ?? defaultRankId;
      if (!rid) continue;
      const r = guildRanks.find((x) => x.id === rid);
      if (!r) continue;
      if (!best || r.position < best.pos) best = { id: rid, pos: r.position };
    }
    return best?.id ?? null;
  }, [guild, uid, memberMeta, guildRanks, leaderRankId, defaultRankId]);

  const userPerms = useMemo(() => {
    if (!guild || !uid) return {};
    if (guild.ownerId === uid) {
      return {
        manageMembers: true,
        manageGroups: true,
        manageEvents: true,
        manageSettings: true,
        manageRanks: true,
        manageRecruitment: true,
      };
    }
    const r = guildRanks.find((x) => x.id === userRankId);
    return r?.permissions ?? {};
  }, [guild, uid, guildRanks, userRankId]);

  const canManageMembers = !!userPerms.manageMembers;
  const canManageEvents = isLeader || !!userPerms.manageEvents;
  const canManageSettings = isLeader || !!userPerms.manageSettings;
  const canOpenSettings =
    isLeader ||
    !!userPerms.manageSettings ||
    !!userPerms.manageRanks ||
    !!userPerms.manageRecruitment;
  const canManageRanks = isLeader || !!userPerms.manageRanks;
  const canManageRecruitment = isLeader || !!userPerms.manageRecruitment;

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
        : view === 'attendance'
          ? t('menuAttendance')
          : view === 'groups'
          ? t('menuGroups')
          : view === 'members'
            ? t('menuMembers')
            : view === 'applications'
              ? t('menuApplications')
              : t('menuSettings');

  return (
    <div className="min-h-screen bg-[#050912] flex">
      <PanelSidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        guild={guild}
        view={view}
        onView={setView}
        isLeader={isLeader}
        canOpenSettings={canOpenSettings}
        canManageRecruitment={canManageRecruitment}
        canManageEvents={canManageEvents}
        recruitmentOpen={recruitmentOpen}
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
          recruitmentOpen={recruitmentOpen}
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
                canManageEvents={canManageEvents}
                timezone={guild.timezone ?? -3}
              />
            </div>
          ) : view === 'attendance' ? (
            <div>
              <div className="mb-4">
                <h1 className="text-2xl md:text-3xl font-heading font-bold text-white">
                  {t('menuAttendance')}{' '}
                  <span className="text-accent">{guild.name}</span>
                </h1>
                <p className="text-muted mt-1">{t('attendanceSub')}</p>
              </div>
              {canManageEvents ? (
                <AttendanceView
                  guildId={guild.id}
                  guildName={guild.name ?? ''}
                  memberIds={guild.members ?? []}
                  memberNames={memberNames}
                  memberMeta={memberMeta}
                />
              ) : (
                <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[rgba(19,29,48,0.4)] p-6 flex items-center gap-2 text-muted">
                  <Shield size={16} /> {t('settingsPermission')}
                </div>
              )}
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
                memberRoles={memberMetaRoles}
                isLeader={isLeader}
              />
            </div>
          ) : view === 'applications' ? (
            <div>
              <div className="mb-4">
                <h1 className="text-2xl md:text-3xl font-heading font-bold text-white">
                  {t('menuApplications')}{' '}
                  <span className="text-accent">{guild.name}</span>
                </h1>
                <p className="text-muted mt-1">{t('applicationsSub')}</p>
              </div>
              {canManageRecruitment ? (
                <ApplicationsView guildId={guild.id} />
              ) : (
                <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[rgba(19,29,48,0.4)] p-6 flex items-center gap-2 text-muted">
                  <Shield size={16} /> {t('settingsPermission')}
                </div>
              )}
            </div>
          ) : view === 'settings' ? (
            <div>
              <div className="mb-4">
                <h1 className="text-2xl md:text-3xl font-heading font-bold text-white">
                  {t('menuSettings')}{' '}
                  <span className="text-accent">{guild.name}</span>
                </h1>
                <p className="text-muted mt-1">{t('settingsSub')}</p>
              </div>
              {canOpenSettings ? (
                <SettingsView
                  guild={guild}
                  isLeader={isLeader}
                  canManageSettings={canManageSettings}
                  canManageRanks={canManageRanks}
                  canManageRecruitment={canManageRecruitment}
                />
              ) : (
                <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[rgba(19,29,48,0.4)] p-6 flex items-center gap-2 text-muted">
                  <Shield size={16} /> {t('settingsPermission')}
                </div>
              )}
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

                {view === 'overview' && (
                  <OverviewView
                    guild={guild}
                    recruitmentOpen={recruitmentOpen}
                  />
                )}

                {view === 'members' && (
                  <MembersView
                    guild={guild}
                    memberNames={memberNames}
                    memberMeta={memberMeta}
                    ranks={guildRanks}
                    memberRanks={guild.memberRanks ?? {}}
                    defaultRankId={defaultRankId}
                    leaderRankId={leaderRankId}
                    canManage={canManageMembers}
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
  canOpenSettings,
  canManageRecruitment,
  canManageEvents,
  recruitmentOpen,
}: {
  open: boolean;
  onToggle: () => void;
  guild: GuildDoc | null;
  view: View;
  onView: (view: View) => void;
  isLeader: boolean;
  canOpenSettings: boolean;
  canManageRecruitment: boolean;
  canManageEvents: boolean;
  recruitmentOpen: boolean | null;
}) {
  const t = useTranslations('GuildPanel');
  const isRecruiting =
    recruitmentOpen === null
      ? guild?.recruitment !== 'closed'
      : recruitmentOpen;

  const items: { key: View; icon: ReactNode; label: string; sub?: boolean }[] = [
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
      key: 'attendance',
      icon: <UserCheck size={16} />,
      label: t('menuAttendance'),
      sub: true,
    },
    {
      key: 'groups',
      icon: <Swords size={20} />,
      label: t('menuGroups'),
    },
    { key: 'members', icon: <Users size={20} />, label: t('menuMembers') },
    ...(canManageRecruitment
      ? [
          {
            key: 'applications' as const,
            icon: <ClipboardList size={20} />,
            label: t('menuApplications'),
          },
        ]
      : []),
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
              ClanForge
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
        {items
          .filter((item) => item.key !== 'attendance' || canManageEvents)
          .map((item) => (
            <button
              key={item.key}
              onClick={() => onView(item.key)}
              title={!open ? item.label : undefined}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
                item.sub && open && 'ml-4 pl-8 border-l border-[rgba(38,51,86,0.3)]',
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
          'p-3 border-t border-[rgba(38,51,86,0.5)] space-y-1',
          open ? 'px-4' : 'px-2',
        )}
      >
        {canOpenSettings && (
          <button
            onClick={() => onView('settings')}
            title={!open ? t('menuSettings') : undefined}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
              view === 'settings'
                ? 'bg-accent/15 text-white border border-accent/30'
                : 'text-muted hover:text-white hover:bg-[rgba(109,40,217,0.08)]',
              !open && 'justify-center px-2',
            )}
          >
            <span className={cn(view === 'settings' && 'text-accent')}>
              <Settings size={20} />
            </span>
            {open && <span>{t('menuSettings')}</span>}
          </button>
        )}
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
  recruitmentOpen,
  onMenuToggle,
}: {
  guild: GuildDoc | null;
  isLeader: boolean;
  recruitmentOpen: boolean | null;
  onMenuToggle: () => void;
}) {
  const t = useTranslations('GuildPanel');
  const isRecruiting =
    recruitmentOpen === null
      ? guild?.recruitment !== 'closed'
      : recruitmentOpen;

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

function OverviewView({
  guild,
  recruitmentOpen,
}: {
  guild: GuildDoc;
  recruitmentOpen: boolean | null;
}) {
  const t = useTranslations('GuildPanel');
  const recruiting =
    recruitmentOpen === null
      ? guild.recruitment === 'open'
      : recruitmentOpen;

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
                recruiting
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20',
              )}
            >
              {recruiting ? t('recruiting') : t('closedRecruitment')}
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
  ranks,
  memberRanks,
  defaultRankId,
  leaderRankId,
  canManage,
}: {
  guild: GuildDoc;
  memberNames: MemberNames;
  memberMeta: MemberMeta;
  ranks: GuildRank[];
  memberRanks: Record<string, string>;
  defaultRankId: string | null;
  leaderRankId: string | null;
  canManage: boolean;
}) {
  const t = useTranslations('GuildPanel');
  const classOptions = useMemo(() => t.raw('classes') as ClassOption[], [t]);
  const [confirm, setConfirm] = useState<{
    type: 'kick' | 'ban';
    characterId: string;
  } | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterRank, setFilterRank] = useState('');
  const [filterRole, setFilterRole] = useState('');

  const defaultRank =
    ranks.find((r) => r.id === defaultRankId) ??
    ranks.find((r) => r.isDefault) ??
    null;
  const assignableRanks = ranks.filter((r) => r.id !== leaderRankId);

  const setBusyKey = (key: string, value: boolean) =>
    setBusy((prev) => ({ ...prev, [key]: value }));

  const handleKickBan = async () => {
    if (!confirm) return;
    const key = `${confirm.type}-${confirm.characterId}`;
    setBusyKey(key, true);
    setError('');
    try {
      const fn = httpsCallable<
        { guildId: string; characterId: string },
        { success: boolean }
      >(
        getFunctions(getFirebaseApp()),
        confirm.type === 'kick' ? 'kickGuildMember' : 'banGuildMember',
      );
      await fn({ guildId: guild.id, characterId: confirm.characterId });
      setConfirm(null);
    } catch {
      setError(confirm.type === 'kick' ? t('kickError') : t('banError'));
    }
    setBusyKey(key, false);
  };

  const handleToggleActive = async (characterId: string) => {
    setBusyKey(`active-${characterId}`, true);
    setError('');
    try {
      const isInactive = (guild.inactiveCharacters ?? []).includes(characterId);
      const fn = httpsCallable<
        { guildId: string; characterId: string; inactive: boolean },
        { success: boolean }
      >(getFunctions(getFirebaseApp()), 'setGuildMemberStatus');
      await fn({ guildId: guild.id, characterId, inactive: !isInactive });
    } catch {
      setError(t('statusError'));
    }
    setBusyKey(`active-${characterId}`, false);
  };

  const handleAssignRank = async (
    characterId: string,
    rankId: string | null,
  ) => {
    setBusyKey(`rank-${characterId}`, true);
    setError('');
    try {
      const fn = httpsCallable<
        { guildId: string; characterId: string; rankId: string | null },
        { success: boolean }
      >(getFunctions(getFirebaseApp()), 'setGuildMemberRank');
      await fn({ guildId: guild.id, characterId, rankId });
    } catch {
      setError(t('statusError'));
    }
    setBusyKey(`rank-${characterId}`, false);
  };

  const inactiveChars = guild.inactiveCharacters ?? [];

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (guild.members ?? []).filter((memberId) => {
      const displayName = memberNames[memberId] ?? memberId.slice(0, 8);
      const meta = memberMeta[memberId];
      const isGuildLeader = memberId === guild.ownerCharacterId;
      const rankId = isGuildLeader
        ? leaderRankId
        : (memberRanks[memberId] ?? defaultRankId);
      if (q && !displayName.toLowerCase().includes(q)) return false;
      if (filterClass && meta?.className !== filterClass) return false;
      if (filterRank && rankId !== filterRank) return false;
      if (filterRole && meta?.role !== filterRole) return false;
      return true;
    });
  }, [
    guild,
    memberNames,
    memberMeta,
    memberRanks,
    leaderRankId,
    defaultRankId,
    ranks,
    query,
    filterClass,
    filterRank,
    filterRole,
  ]);

  return (
    <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-6">
      <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2 mb-4">
        <Users size={18} className="text-accent" /> {t('membersTitle')}
      </h2>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full h-10 pl-9 pr-3 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            title={t('colClass')}
            className="h-10 pl-3 pr-7 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-xs text-white focus:outline-none focus:border-accent/50 transition-colors appearance-none"
          >
            <option value="" className="bg-[#0a1122]">
              {t('colClass')}: {t('filterAll')}
            </option>
            {classOptions.map((c) => (
              <option key={c.value} value={c.value} className="bg-[#0a1122]">
                {c.label}
              </option>
            ))}
          </select>
          <select
            value={filterRank}
            onChange={(e) => setFilterRank(e.target.value)}
            title={t('colRank')}
            className="h-10 pl-3 pr-7 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-xs text-white focus:outline-none focus:border-accent/50 transition-colors appearance-none"
          >
            <option value="" className="bg-[#0a1122]">
              {t('colRank')}: {t('filterAll')}
            </option>
            {ranks.map((r) => (
              <option key={r.id} value={r.id} className="bg-[#0a1122]">
                {r.name}
              </option>
            ))}
          </select>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            title={t('colRole')}
            className="h-10 pl-3 pr-7 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-xs text-white focus:outline-none focus:border-accent/50 transition-colors appearance-none"
          >
            <option value="" className="bg-[#0a1122]">
              {t('colRole')}: {t('filterAll')}
            </option>
            {DEFAULT_ROLES.map((r) => (
              <option key={r.name} value={r.name} className="bg-[#0a1122]">
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="hidden md:grid md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1.2fr)_auto] gap-3 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
        <span>{t('colMember')}</span>
        <span>{t('colClass')}</span>
        <span>{t('colCp')}</span>
        <span>{t('colRole')}</span>
        <span>{t('colRank')}</span>
        <span className="text-right">{t('colActions')}</span>
      </div>

      <div className="space-y-2">
        {filteredMembers.map((memberId) => {
          const isGuildLeader = memberId === guild.ownerCharacterId;
          const isInactive = inactiveChars.includes(memberId);
          const displayName = memberNames[memberId] ?? memberId.slice(0, 8);
          const meta = memberMeta[memberId];
          const classOption = classOptions.find(
            (c) => c.value === meta?.className,
          );
          const charRole = meta?.role
            ? DEFAULT_ROLES.find((r) => r.name === meta.role)
            : undefined;
          const rankId = isGuildLeader
            ? leaderRankId
            : (memberRanks[memberId] ?? defaultRankId);
          const rank = ranks.find((r) => r.id === rankId);
          const canManageThis = canManage && !isGuildLeader;

          return (
            <div
              key={memberId}
              className={cn(
                'rounded-lg border p-3',
                isInactive
                  ? 'border-[rgba(38,51,86,0.3)] bg-[rgba(10,18,32,0.25)] opacity-75'
                  : 'border-[rgba(38,51,86,0.3)] bg-[rgba(10,18,32,0.4)]',
              )}
            >
              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1.2fr)_auto] gap-3 items-center">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-accent/15 border border-accent/20 flex items-center justify-center overflow-hidden shrink-0">
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
                    {isInactive && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-400/10 text-yellow-400">
                        {t('memberInactive')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] text-muted md:hidden mb-0.5">
                    {t('colClass')}
                  </p>
                  <p className="text-sm text-white truncate">
                    {classOption?.label ??
                      (meta?.className ? meta.className : '—')}
                  </p>
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] text-muted md:hidden mb-0.5">
                    {t('colCp')}
                  </p>
                  <p className="text-sm text-white">
                    {t('cp')}{' '}
                    {new Intl.NumberFormat('pt-BR').format(meta?.level ?? 0)}
                  </p>
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] text-muted md:hidden mb-0.5">
                    {t('colRole')}
                  </p>
                  {charRole ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-white">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: charRole.color }}
                      />
                      {charRole.name}
                    </span>
                  ) : (
                    <span className="text-sm text-muted">
                      {meta?.role || t('roleNone')}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] text-muted md:hidden mb-0.5">
                    {t('colRank')}
                  </p>
                  {canManageThis ? (
                    <select
                      value={memberRanks[memberId] ?? ''}
                      onChange={(e) =>
                        handleAssignRank(memberId, e.target.value || null)
                      }
                      disabled={busy[`rank-${memberId}`]}
                      title={t('assignRank')}
                      className="w-full max-w-[170px] text-xs bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded px-1.5 py-1 text-white focus:outline-none focus:border-accent/50 transition-colors disabled:opacity-50"
                    >
                      <option value="">
                        {defaultRank?.name ?? t('rankMember')} (
                        {t('rankDefaultLabel')})
                      </option>
                      {assignableRanks.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded"
                      style={
                        rank
                          ? {
                              backgroundColor: `${rank.color}1a`,
                              color: rank.color,
                            }
                          : undefined
                      }
                    >
                      {isGuildLeader && <Crown size={11} />}
                      {rank?.name ??
                        (isGuildLeader
                          ? t('rankLeader')
                          : defaultRank?.name ?? t('rankMember'))}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] text-muted md:hidden mb-0.5">
                    {t('colActions')}
                  </p>
                  {canManageThis ? (
                    <div className="flex items-center gap-1 md:justify-end">
                      <button
                        onClick={() =>
                          setConfirm({ type: 'kick', characterId: memberId })
                        }
                        title={t('actionKick')}
                        className="p-1.5 rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <UserX size={15} />
                      </button>
                      <button
                        onClick={() =>
                          setConfirm({ type: 'ban', characterId: memberId })
                        }
                        title={t('actionBan')}
                        className="p-1.5 rounded-lg text-muted hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
                      >
                        <Ban size={15} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(memberId)}
                        disabled={busy[`active-${memberId}`]}
                        title={isInactive ? t('actionActivate') : t('actionInactivate')}
                        className={cn(
                          'p-1.5 rounded-lg transition-colors disabled:opacity-50',
                          isInactive
                            ? 'text-emerald-400 hover:bg-emerald-500/10'
                            : 'text-muted hover:text-yellow-400 hover:bg-yellow-500/10',
                        )}
                      >
                        {busy[`active-${memberId}`] ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : isInactive ? (
                          <UserCheck size={15} />
                        ) : (
                          <UserMinus size={15} />
                        )}
                      </button>
                    </div>
                  ) : (
                    <span className="block text-xs text-muted md:text-right">
                      —
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredMembers.length === 0 && (
        <div className="flex flex-col items-center text-center py-8">
          <Users size={22} className="text-muted mb-2" />
          <p className="text-sm text-muted">{t('membersEmpty')}</p>
        </div>
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.type === 'kick' ? t('kickTitle') : t('banTitle')}
          message={
            confirm.type === 'kick'
              ? t('kickMessage', {
                  name: memberNames[confirm.characterId] ?? '',
                })
              : t('banMessage', {
                  name: memberNames[confirm.characterId] ?? '',
                })
          }
          danger
          confirmLabel={confirm.type === 'kick' ? t('actionKick') : t('actionBan')}
          onConfirm={handleKickBan}
          onClose={() => setConfirm(null)}
        />
      )}
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

const FOCUS_OPTIONS: Option[] = [
  { value: 'pvp', label: 'PvP' },
  { value: 'pve', label: 'PvE' },
  { value: 'pvpve', label: 'PvPvE' },
  { value: 'rp', label: 'RP' },
];

const MENTALITY_OPTIONS: Option[] = [
  { value: 'hardcore', label: 'Hardcore' },
  { value: 'semi_hardcore', label: 'Semi-hardcore' },
  { value: 'casual', label: 'Casual' },
];

const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const ALLOWED_BANNER_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const MAX_BANNER_BYTES = 4 * 1024 * 1024;

function SettingsView({
  guild,
  isLeader,
  canManageSettings,
  canManageRanks,
  canManageRecruitment,
}: {
  guild: GuildDoc;
  isLeader: boolean;
  canManageSettings: boolean;
  canManageRanks: boolean;
  canManageRecruitment: boolean;
}) {
  const t = useTranslations('GuildPanel');
  const languages = useMemo(() => t.raw('languages') as Option[], [t]);
  const [settingsTab, setSettingsTab] = useState<
    'general' | 'ranks' | 'recruitment' | 'discord'
  >('general');
  const currentAllowed =
    (settingsTab === 'general' && canManageSettings) ||
    (settingsTab === 'ranks' && canManageRanks) ||
    (settingsTab === 'recruitment' && canManageRecruitment) ||
    (settingsTab === 'discord' && canManageSettings && isLeader);
  const activeTab = currentAllowed
    ? settingsTab
    : canManageSettings
      ? 'general'
      : canManageRanks
        ? 'ranks'
        : 'recruitment';

  const [name, setName] = useState(guild.name ?? '');
  const [description, setDescription] = useState(guild.description ?? '');
  const [focus, setFocus] = useState(guild.focus ?? '');
  const [mentality, setMentality] = useState(guild.mentality ?? '');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(
    guild.languages ?? [],
  );

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    guild.logoUrl ?? null,
  );
  const [logoError, setLogoError] = useState('');
  const [removeLogo, setRemoveLogo] = useState(false);

  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(
    guild.bannerUrl ?? null,
  );
  const [bannerError, setBannerError] = useState('');
  const [removeBanner, setRemoveBanner] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const logoInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  const handleFile = (
    file: File | undefined,
    allowed: string[],
    max: number,
    setFile: (f: File | null) => void,
    setPreview: (p: string | null) => void,
    setErr: (s: string) => void,
    setRemove: (b: boolean) => void,
    invalid: string,
    tooLarge: string,
  ) => {
    setErr('');
    if (!file) return;
    if (!allowed.includes(file.type)) {
      setErr(invalid);
      return;
    }
    if (file.size > max) {
      setErr(tooLarge);
      return;
    }
    setFile(file);
    setPreview(URL.createObjectURL(file));
    setRemove(false);
  };

  const toggleLanguage = (value: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(value)
        ? prev.filter((l) => l !== value)
        : [...prev, value],
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError(t('settingsNameRequired'));
      return;
    }
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const db = getFirebaseDb();
      const payload: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || null,
        focus: focus || null,
        mentality: mentality || null,
        languages: selectedLanguages,
        updatedAt: serverTimestamp(),
      };

      if (logoFile && logoPreview) {
        const ext = logoFile.name.split('.').pop() ?? 'png';
        const fileRef = storageRef(
          getFirebaseStorage(),
          `guild-logos/${guild.id}/logo.${ext}`,
        );
        await uploadBytes(fileRef, logoFile, { contentType: logoFile.type });
        payload.logoUrl = await getDownloadURL(fileRef);
      } else if (removeLogo) {
        payload.logoUrl = null;
      }

      if (bannerFile && bannerPreview) {
        const ext = bannerFile.name.split('.').pop() ?? 'png';
        const fileRef = storageRef(
          getFirebaseStorage(),
          `guild-banners/${guild.id}/banner.${ext}`,
        );
        await uploadBytes(fileRef, bannerFile, { contentType: bannerFile.type });
        payload.bannerUrl = await getDownloadURL(fileRef);
      } else if (removeBanner) {
        payload.bannerUrl = null;
      }

      await updateDoc(doc(db, COLLECTIONS.GUILDS, guild.id), payload);
      setLogoFile(null);
      setBannerFile(null);
      setRemoveLogo(false);
      setRemoveBanner(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError(t('settingsError'));
    }
    setSaving(false);
  };

  return (
    <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-6">
      <div className="flex items-center gap-1 mb-6 border-b border-[rgba(38,51,86,0.3)] pb-4">
        {canManageSettings && (
          <button
            onClick={() => setSettingsTab('general')}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm transition-colors border',
              activeTab === 'general'
                ? 'bg-accent/15 text-white border-accent/30'
                : 'text-muted hover:text-white border-transparent',
            )}
          >
            {t('tabGeneral')}
          </button>
        )}
        {canManageRanks && (
          <button
            onClick={() => setSettingsTab('ranks')}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm transition-colors border',
              activeTab === 'ranks'
                ? 'bg-accent/15 text-white border-accent/30'
                : 'text-muted hover:text-white border-transparent',
            )}
          >
            {t('tabRanks')}
          </button>
        )}
        {canManageRecruitment && (
          <button
            onClick={() => setSettingsTab('recruitment')}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm transition-colors border',
              activeTab === 'recruitment'
                ? 'bg-accent/15 text-white border-accent/30'
                : 'text-muted hover:text-white border-transparent',
            )}
          >
            {t('tabRecruitment')}
          </button>
        )}
        {canManageSettings && isLeader && (
          <button
            onClick={() => setSettingsTab('discord')}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm transition-colors border',
              activeTab === 'discord'
                ? 'bg-accent/15 text-white border-accent/30'
                : 'text-muted hover:text-white border-transparent',
            )}
          >
            {t('tabDiscord')}
          </button>
        )}
      </div>

      {activeTab === 'discord' ? (
        <DiscordSettings guildId={guild.id} />
      ) : activeTab === 'recruitment' ? (
        <RecruitmentSettings guildId={guild.id} />
      ) : activeTab === 'ranks' ? (
        <RanksTab guildId={guild.id} />
      ) : (
      <>
      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <CheckCircle2 size={16} /> {t('settingsSaved')}
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label className="block text-sm text-muted mb-1.5">
            {t('settingsNameLabel')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('settingsNamePlaceholder')}
            maxLength={40}
            className="w-full h-11 px-3 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm text-muted mb-1.5">
            {t('settingsLogoLabel')}
          </label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#0a1122] flex items-center justify-center overflow-hidden shrink-0">
              {logoPreview ? (
                <img src={logoPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <ImagePlus size={22} className="text-muted" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <input
                ref={logoInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) =>
                  handleFile(
                    e.target.files?.[0],
                    ALLOWED_LOGO_TYPES,
                    MAX_LOGO_BYTES,
                    setLogoFile,
                    setLogoPreview,
                    setLogoError,
                    setRemoveLogo,
                    t('settingsLogoInvalid'),
                    t('settingsLogoTooLarge'),
                  )
                }
              />
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => logoInput.current?.click()}
                  className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-[rgba(38,51,86,0.5)] bg-[#0a1122] text-white text-xs hover:border-accent/40 transition-colors"
                >
                  <ImagePlus size={14} />{' '}
                  {logoFile ? t('settingsLogoChange') : t('settingsLogoUpload')}
                </button>
                {logoPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogoFile(null);
                      setLogoPreview(null);
                      setRemoveLogo(true);
                      if (logoInput.current) logoInput.current.value = '';
                    }}
                    className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-red-500/30 text-red-400 text-xs hover:bg-red-500/10 transition-colors"
                  >
                    <X size={14} /> {t('settingsLogoRemove')}
                  </button>
                )}
              </div>
              <p className="text-xs text-muted mt-1.5">{t('settingsLogoSub')}</p>
              {logoError && (
                <p className="text-xs text-red-400 mt-1.5">{logoError}</p>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm text-muted mb-1.5">
            {t('settingsBannerLabel')}
          </label>
          <div className="rounded-xl overflow-hidden border border-[rgba(38,51,86,0.5)] bg-[#0a1122]">
            <div className="h-28 md:h-36 w-full bg-[#0a1122]">
              {bannerPreview ? (
                <img src={bannerPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-accent/15 via-accent/5 to-transparent">
                  <ImagePlus size={26} className="text-muted" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 p-3 flex-wrap">
              <input
                ref={bannerInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) =>
                  handleFile(
                    e.target.files?.[0],
                    ALLOWED_BANNER_TYPES,
                    MAX_BANNER_BYTES,
                    setBannerFile,
                    setBannerPreview,
                    setBannerError,
                    setRemoveBanner,
                    t('settingsBannerInvalid'),
                    t('settingsBannerTooLarge'),
                  )
                }
              />
              <button
                type="button"
                onClick={() => bannerInput.current?.click()}
                className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-[rgba(38,51,86,0.5)] bg-[#0a1122] text-white text-xs hover:border-accent/40 transition-colors"
              >
                <ImagePlus size={14} />{' '}
                {bannerFile ? t('settingsBannerChange') : t('settingsBannerUpload')}
              </button>
              {bannerPreview && (
                <button
                  type="button"
                  onClick={() => {
                    setBannerFile(null);
                    setBannerPreview(null);
                    setRemoveBanner(true);
                    if (bannerInput.current) bannerInput.current.value = '';
                  }}
                  className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-red-500/30 text-red-400 text-xs hover:bg-red-500/10 transition-colors"
                >
                  <X size={14} /> {t('settingsBannerRemove')}
                </button>
              )}
              <p className="text-xs text-muted w-full">{t('settingsBannerSub')}</p>
              {bannerError && (
                <p className="text-xs text-red-400 w-full">{bannerError}</p>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm text-muted mb-1.5">
            {t('settingsDescriptionLabel')}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('settingsDescriptionPlaceholder')}
            maxLength={300}
            rows={4}
            className="w-full px-3 py-2 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors resize-none"
          />
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted">{t('settingsDescriptionHint')}</p>
            <p className="text-xs text-muted">{description.length}/300</p>
          </div>
        </div>

        <div>
          <label className="block text-sm text-muted mb-1.5">
            {t('settingsFocusLabel')}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-lg border border-[rgba(38,51,86,0.5)] bg-[#0a1122]">
            {FOCUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFocus(opt.value)}
                className={cn(
                  'h-9 rounded-md text-xs font-medium transition-colors',
                  focus === opt.value
                    ? 'bg-accent text-white'
                    : 'text-muted hover:text-white',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-muted mb-1.5">
            {t('settingsMentalityLabel')}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 p-1 rounded-lg border border-[rgba(38,51,86,0.5)] bg-[#0a1122]">
            {MENTALITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMentality(opt.value)}
                className={cn(
                  'h-9 rounded-md text-xs font-medium transition-colors',
                  mentality === opt.value
                    ? 'bg-accent text-white'
                    : 'text-muted hover:text-white',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-muted mb-1.5">
            {t('languagesLabel')}
          </label>
          <div className="flex flex-wrap gap-2">
            {languages.map((lang) => {
              const selected = selectedLanguages.includes(lang.value);
              return (
                <button
                  key={lang.value}
                  type="button"
                  onClick={() => toggleLanguage(lang.value)}
                  className={cn(
                    'px-3 h-8 rounded-lg text-xs border transition-all duration-200',
                    selected
                      ? 'bg-accent/15 border-accent/40 text-accent'
                      : 'border-[rgba(38,51,86,0.5)] bg-[#0a1122] text-muted hover:text-white hover:border-accent/30',
                  )}
                >
                  {lang.label}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-11 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" /> {t('settingsSaving')}
            </>
          ) : (
            <>
              <Check size={17} /> {t('settingsSave')}
            </>
          )}
        </button>
      </div>
      </>
      )}
    </div>
  );
}
