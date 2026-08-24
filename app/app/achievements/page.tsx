'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import {
  Trophy,
  Medal,
  Star,
  Lock,
  Loader2,
  Shield,
  User as UserIcon,
  MessageCircle,
  Calendar,
  Gem,
  UserPlus,
  Video,
  CalendarCheck,
  Users,
  Radio,
  Crown,
} from 'lucide-react';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/admin/firebase/client';
import { ACHIEVEMENTS, rarityLabel, type Rarity } from '@/lib/achievements/definitions';
import { cn } from '@/lib/admin/utils/cn';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const rarityConfig: Record<Rarity, { color: string; bg: string; border: string }> = {
  common: { color: 'text-muted', bg: 'bg-muted', border: 'border-muted/20' },
  rare: { color: 'text-blue-400', bg: 'bg-blue-500', border: 'border-blue-500/30' },
  epic: { color: 'text-purple-400', bg: 'bg-purple-500', border: 'border-purple-500/30' },
  legendary: { color: 'text-orange-400', bg: 'bg-orange-500', border: 'border-orange-500/30' },
};

const iconMap: Record<string, React.ElementType> = {
  User: UserIcon,
  Shield,
  Crown,
  UserCircle: UserIcon,
  MessageCircle,
  Calendar,
  Gem,
  UserPlus,
  Video,
  CalendarCheck,
  Users,
  Radio,
  Trophy,
  Medal,
};

const triggerToStat: Record<string, string> = {
  event_attended: 'eventsAttended',
  dkp_loot: 'dkpLoots',
  friend_added: 'friendsAdded',
  livestream: 'livestreams',
};

export default function AchievementsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [counters, setCounters] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), (u) => {
      setUser(u);
      setAuthChecked(true);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) {
      setUnlockedIds(new Set());
      setCounters({});
      setLoading(false);
      return;
    }
    const db = getFirebaseDb();
    const unsubAch = onSnapshot(collection(db, `users/${user.uid}/achievements`), (snap) => {
      setUnlockedIds(new Set(snap.docs.map((d) => d.id)));
      setLoading(false);
    });
    const unsubStats = onSnapshot(doc(db, `users/${user.uid}/stats/counters`), (snap) => {
      if (snap.exists()) setCounters(snap.data() as Record<string, number>);
      else setCounters({});
    });
    return () => {
      unsubAch();
      unsubStats();
    };
  }, [user]);

  const grouped = useMemo(() => {
    const groups: Record<Rarity, typeof ACHIEVEMENTS> = {
      common: [],
      rare: [],
      epic: [],
      legendary: [],
    };
    for (const ach of ACHIEVEMENTS) {
      if (!groups[ach.rarity]) groups[ach.rarity] = [];
      groups[ach.rarity].push(ach);
    }
    return groups;
  }, []);

  const stats = useMemo(() => {
    const total = ACHIEVEMENTS.length;
    const unlocked = unlockedIds.size;
    const inProgress = ACHIEVEMENTS.filter((a) => {
      if (unlockedIds.has(a.id)) return false;
      if (a.threshold === 1) return false;
      const statField = triggerToStat[a.trigger];
      const count = statField ? (counters[statField] ?? 0) : 0;
      return count > 0 && count < a.threshold;
    }).length;
    const locked = total - unlocked - inProgress;
    return { total, unlocked, inProgress, locked };
  }, [unlockedIds, counters]);

  if (!authChecked || loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted">
        <Loader2 size={24} className="animate-spin mr-2" /> Carregando conquistas...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-16 rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)]">
        <Lock size={32} className="mx-auto text-muted mb-3" />
        <p className="text-white font-medium">Entre para ver suas conquistas</p>
      </div>
    );
  }

  const renderSection = (rarity: Rarity, title: string, subtitle: string) => {
    const list = grouped[rarity];
    if (!list?.length) return null;
    return (
      <motion.div key={rarity} variants={fadeUp} className="space-y-3">
        <div>
          <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2">
            <span className={cn('w-2 h-2 rounded-full', rarityConfig[rarity].bg)} />
            {title}
            <span className="text-xs font-normal text-muted">• {rarityLabel[rarity]}</span>
          </h2>
          <p className="text-xs text-muted mt-1">{subtitle}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((ach) => {
            const unlocked = unlockedIds.has(ach.id);
            const statField = triggerToStat[ach.trigger];
            const count = statField ? (counters[statField] ?? 0) : 0;
            const progress = ach.threshold === 1 ? (unlocked ? 1 : 0) : Math.min(count, ach.threshold);
            const pct = ach.threshold === 1 ? (unlocked ? 100 : 0) : Math.round((progress / ach.threshold) * 100);
            const rc = rarityConfig[ach.rarity];
            const Icon = iconMap[ach.icon] ?? Trophy;
            return (
              <div
                key={ach.id}
                className={cn(
                  'rounded-xl border bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-4 transition-all duration-300',
                  unlocked ? 'border-accent/30 shadow-lg shadow-accent/5' : rc.border,
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center',
                      unlocked ? 'bg-accent/20' : 'bg-[rgba(38,51,86,0.3)]',
                    )}
                  >
                    <Icon size={18} className={unlocked ? 'text-accent' : 'text-muted'} />
                  </div>
                  <span className={cn('text-[10px] font-bold uppercase tracking-wider', rc.color)}>
                    {rarityLabel[ach.rarity]} • {ach.xp} XP
                  </span>
                </div>
                <p className={cn('text-sm font-medium', unlocked ? 'text-white' : 'text-muted')}>{ach.title}</p>
                <p className="text-xs text-muted mt-1 leading-relaxed">{ach.description}</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-[rgba(38,51,86,0.5)] overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', unlocked ? 'bg-accent' : rc.bg, 'opacity-70')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted shrink-0">
                    {ach.threshold === 1 ? (unlocked ? '1/1' : '0/1') : `${progress}/${ach.threshold}`}
                  </span>
                </div>
                {unlocked ? (
                  <p className="text-[10px] text-accent mt-2 flex items-center gap-1">
                    <Star size={10} /> Desbloqueada
                  </p>
                ) : ach.threshold > 1 && count > 0 ? (
                  <p className="text-[10px] text-muted mt-2">{pct}% concluído</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{ animate: { transition: { staggerChildren: 0.05 } } }}
      className="space-y-8"
    >
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-heading font-bold text-white">Conquistas</h1>
        <p className="text-muted mt-1">Desbloqueie conquistas e mostre seu progresso. Eventos contam ao resgatar o código no calendário.</p>
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-4">
        {[
          { label: 'Desbloqueadas', value: String(stats.unlocked), icon: Trophy, color: 'text-accent' },
          { label: 'Em Progresso', value: String(stats.inProgress), icon: Medal, color: 'text-yellow-400' },
          { label: 'Trancadas', value: String(stats.locked), icon: Lock, color: 'text-muted' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-4 text-center"
          >
            <s.icon size={22} className={cn('mx-auto mb-2', s.color)} />
            <p className="text-2xl font-bold text-white font-heading">{s.value}</p>
            <p className="text-xs text-muted">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {renderSection('common', 'Comum', 'Primeiros passos no ClanForge — complete uma vez cada')}
      {renderSection('rare', 'Rara', 'Dedicação contínua — 50 conquistas cumulativas')}
      {renderSection('epic', 'Épica', 'Lenda viva — 200 conquistas cumulativas')}
      <motion.div variants={fadeUp} className="rounded-xl border border-dashed border-[rgba(38,51,86,0.4)] p-4 text-center">
        <p className="text-xs text-muted">
          💡 Streams são detectadas automaticamente quando você fica em live na Twitch/Kick/YouTube (integração futura). DKP e amizades contam quando o sistema registrar o loot ou a conexão.
        </p>
      </motion.div>
    </motion.div>
  );
}
