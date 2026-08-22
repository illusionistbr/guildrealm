'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/admin/firebase/client';
import { cn } from '@/lib/admin/utils/cn';
import {
  UserPlus,
  UserMinus,
  Shield,
  ShieldOff,
  ArrowUpDown,
  Clock,
} from 'lucide-react';

interface ActivityEntry {
  id: string;
  type: 'join' | 'leave' | 'kick' | 'ban' | 'rank_change' | 'status_change';
  userId: string;
  characterId: string;
  characterName: string;
  details?: Record<string, unknown>;
  createdAt: Date;
}

const ACTIVITY_ICONS: Record<string, typeof UserPlus> = {
  join: UserPlus,
  leave: UserMinus,
  kick: ShieldOff,
  ban: ShieldOff,
  rank_change: ArrowUpDown,
  status_change: Shield,
};

const ACTIVITY_COLORS: Record<string, string> = {
  join: 'text-emerald-400 bg-emerald-500/10',
  leave: 'text-yellow-400 bg-yellow-500/10',
  kick: 'text-orange-400 bg-orange-500/10',
  ban: 'text-red-400 bg-red-500/10',
  rank_change: 'text-accent bg-accent/10',
  status_change: 'text-blue-400 bg-blue-500/10',
};

function timeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

interface GuildActivityFeedProps {
  guildId: string;
}

export function GuildActivityFeed({ guildId }: GuildActivityFeedProps) {
  const t = useTranslations('GuildPanel');
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!guildId) return;

    const q = query(
      collection(getFirebaseDb(), 'guilds', guildId, 'activity'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() || new Date(),
      })) as ActivityEntry[];
      setActivities(items);
      setLoading(false);
    });

    return unsub;
  }, [guildId]);

  const getActivityMessage = (activity: ActivityEntry) => {
    switch (activity.type) {
      case 'join':
        return t('activityJoin', { name: activity.characterName });
      case 'leave':
        return t('activityLeave', { name: activity.characterName });
      case 'kick':
        return t('activityKick', { name: activity.characterName });
      case 'ban':
        return t('activityBan', { name: activity.characterName });
      case 'rank_change':
        return t('activityRankChange', { name: activity.characterName });
      case 'status_change':
        return activity.details?.inactive
          ? t('activityInactive', { name: activity.characterName })
          : t('activityActive', { name: activity.characterName });
      default:
        return activity.characterName;
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[rgba(19,29,48,0.4)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={18} className="text-accent" />
          <h3 className="text-white font-heading font-semibold">{t('activityFeed')}</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-[#0a1122] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[rgba(19,29,48,0.4)] p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock size={18} className="text-accent" />
        <h3 className="text-white font-heading font-semibold">{t('activityFeed')}</h3>
      </div>

      {activities.length === 0 ? (
        <p className="text-muted text-sm text-center py-4">{t('activityNoEntries')}</p>
      ) : (
        <div className="space-y-2">
          {activities.map((activity) => {
            const Icon = ACTIVITY_ICONS[activity.type] || Clock;
            const colorClass = ACTIVITY_COLORS[activity.type] || 'text-muted bg-muted/10';
            return (
              <div
                key={activity.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-[#0a1122] hover:bg-[rgba(109,40,217,0.05)] transition-colors"
              >
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', colorClass)}>
                  <Icon size={16} />
                </div>
                <p className="flex-1 text-sm text-white">
                  {getActivityMessage(activity)}
                </p>
                <span className="text-xs text-muted shrink-0">
                  {timeAgo(activity.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
