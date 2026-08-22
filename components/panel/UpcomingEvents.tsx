'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/admin/firebase/client';
import {
  CalendarDays,
  MapPin,
  ChevronRight,
} from 'lucide-react';

const EVENT_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  RAID: { label: 'Raid', icon: '🐉', color: '#f97316' },
  DUNGEON: { label: 'Dungeon', icon: '🏰', color: '#3b82f6' },
  WORLD_BOSS: { label: 'World Boss', icon: '👹', color: '#ef4444' },
  GUILD_WAR: { label: 'Guild War', icon: '⚔️', color: '#a855f7' },
  PVP: { label: 'PvP', icon: '🛡️', color: '#fb7185' },
  TOURNAMENT: { label: 'Torneio', icon: '🏆', color: '#eab308' },
  MEETING: { label: 'Reunião', icon: '📋', color: '#8b5cf6' },
  TRAINING: { label: 'Treinamento', icon: '📚', color: '#22c55e' },
  OTHER: { label: 'Outro', icon: '📋', color: '#8b5cf6' },
};

interface GuildEvent {
  id: string;
  guildId: string;
  title: string;
  description: string;
  type: string;
  start: Date;
  end: Date;
  location: string;
  maxParticipants: number | null;
  status: string;
  createdBy: string;
  createdByName: string;
}

interface UpcomingEventsProps {
  guildId: string;
}

export function UpcomingEvents({ guildId }: UpcomingEventsProps) {
  const t = useTranslations('GuildPanel');
  const [events, setEvents] = useState<GuildEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!guildId) return;

    const now = new Date();
    const q = query(
      collection(getFirebaseDb(), 'guild_events'),
      where('guildId', '==', guildId),
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          guildId: data.guildId as string,
          title: data.title as string,
          description: data.description as string,
          type: data.type as string,
          start: data.start?.toDate() || new Date(),
          end: data.end?.toDate() || new Date(),
          location: data.location as string,
          maxParticipants: data.maxParticipants as number | null,
          status: data.status as string,
          createdBy: data.createdBy as string,
          createdByName: data.createdByName as string,
        };
      });
      const items = all
        .filter((e) => e.status === 'active' && e.start >= now)
        .sort((a, b) => a.start.getTime() - b.start.getTime())
        .slice(0, 4);
      setEvents(items);
      setLoading(false);
    });

    return unsub;
  }, [guildId]);

  const formatEventDate = (date: Date) => {
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return t('eventToday');
    if (diffDays === 1) return t('eventTomorrow');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[rgba(19,29,48,0.4)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays size={18} className="text-accent" />
          <h3 className="text-white font-heading font-semibold">{t('upcomingEvents')}</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-[#0a1122] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[rgba(19,29,48,0.4)] p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-accent" />
          <h3 className="text-white font-heading font-semibold">{t('upcomingEvents')}</h3>
        </div>
        <Link
          href="#"
          className="text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
        >
          {t('viewAll')} <ChevronRight size={12} />
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="text-muted text-sm text-center py-4">{t('noUpcomingEvents')}</p>
      ) : (
        <div className="space-y-2">
          {events.map((event) => {
            const typeConfig = EVENT_TYPE_CONFIG[event.type] || EVENT_TYPE_CONFIG.OTHER;
            return (
              <div
                key={event.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-[#0a1122] hover:bg-[rgba(109,40,217,0.05)] transition-colors cursor-pointer"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                  style={{ backgroundColor: `${typeConfig.color}20` }}
                >
                  {typeConfig.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{event.title}</p>
                  <div className="flex items-center gap-3 text-xs text-muted mt-0.5">
                    <span>{formatEventDate(event.start)}</span>
                    <span>{event.start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={10} /> {event.location}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted shrink-0" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
