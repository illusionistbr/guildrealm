'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getFirebaseDb, getFirebaseAuth } from '@/lib/admin/firebase/client';
import { COLLECTIONS } from '@/lib/admin/firebase/collections';
import { EVENT_TYPE_CONFIG } from '@/lib/calendar/types';
import { useEventParticipants, tsToDate } from '@/lib/calendar/hooks';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock,
  LogIn,
  MapPin,
  Shield,
  Users,
  X,
} from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

type EventDoc = {
  id: string;
  guildId?: string;
  title?: string;
  description?: string;
  type?: keyof typeof EVENT_TYPE_CONFIG;
  start?: { seconds: number };
  end?: { seconds: number };
  location?: string;
  maxParticipants?: number | null;
  allowRegistration?: boolean;
  status?: 'active' | 'cancelled' | 'completed';
  createdByName?: string;
};

type AuthUser = { uid: string; displayName: string | null };

export default function PublicEventPage() {
  const t = useTranslations('EventPage');
  const locale = useLocale();
  const params = useParams<{ id: string; eventId: string }>();

  const [event, setEvent] = useState<EventDoc | null>(null);
  const [guildName, setGuildName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const { participants, loading: participantsLoading, joinEvent, leaveEvent } =
    useEventParticipants(params.eventId);

  useEffect(() => {
    let disposed = false;
    const load = async () => {
      try {
        const eventSnap = await getDoc(
          doc(getFirebaseDb(), COLLECTIONS.GUILD_EVENTS, params.eventId),
        );
        if (!disposed && eventSnap.exists()) {
          const data = eventSnap.data() as Omit<EventDoc, 'id'>;
          setEvent({ id: eventSnap.id, ...data });
          if (data.guildId) {
            const guildSnap = await getDoc(
              doc(getFirebaseDb(), COLLECTIONS.GUILDS, data.guildId),
            );
            if (!disposed && guildSnap.exists()) {
              setGuildName((guildSnap.data().name as string) ?? null);
            }
          }
        }
      } finally {
        if (!disposed) setLoading(false);
      }
    };
    load();
    return () => {
      disposed = true;
    };
  }, [params.eventId]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (u) => {
      setUser(u ? { uid: u.uid, displayName: u.displayName } : null);
    });
    return unsubscribe;
  }, []);

  const isParticipant = participants.some((p) => p.userId === user?.uid);
  const isFull =
    typeof event?.maxParticipants === 'number' &&
    event.maxParticipants > 0 &&
    participants.length >= event.maxParticipants;
  const registrationOpen =
    !!event?.allowRegistration && event?.status === 'active';

  const formatDate = (ts?: { seconds: number }) => {
    if (!ts) return '—';
    try {
      return new Intl.DateTimeFormat(locale, {
        dateStyle: 'full',
        timeStyle: 'short',
      }).format(tsToDate(ts));
    } catch {
      return '—';
    }
  };

  const handleJoin = async () => {
    if (!user || !params.eventId) return;
    setJoining(true);
    setError('');
    try {
      await joinEvent(params.eventId, user.uid, user.displayName || 'Player');
    } catch (err: unknown) {
      setError(
        (err as { message?: string }).message ?? 'Não foi possível confirmar.',
      );
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!user || !params.eventId) return;
    setJoining(true);
    setError('');
    try {
      await leaveEvent(params.eventId, user.uid);
    } catch (err: unknown) {
      setError(
        (err as { message?: string }).message ?? 'Não foi possível sair.',
      );
    } finally {
      setJoining(false);
    }
  };

  if (!loading && !event) {
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
            href="/guilds"
            className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover mt-4 transition-colors"
          >
            <ChevronLeft size={16} /> {t('backToHome')}
          </Link>
        </div>
      </div>
    );
  }

  if (loading || !event) {
    return (
      <div className="min-h-screen bg-[#050912] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  const typeCfg = EVENT_TYPE_CONFIG[event.type ?? 'OTHER'] ?? EVENT_TYPE_CONFIG.OTHER;
  const cancelled = event.status === 'cancelled';
  const completed = event.status === 'completed';

  return (
    <div className="min-h-screen bg-[#050912]">
      <div className="shell py-10">
        <Link
          href={`/guilds/${params.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-white transition-colors mb-8"
        >
          <ChevronLeft size={18} /> {t('backToGuild')}
        </Link>

        <motion.div
          initial="initial"
          animate="animate"
          variants={{ animate: { transition: { staggerChildren: 0.06 } } }}
          className="max-w-2xl mx-auto"
        >
          <motion.div
            variants={fadeUp}
            className="rounded-xl overflow-hidden border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.8)] to-[rgba(10,18,32,0.6)]"
          >
            <div className="h-2" style={{ background: typeCfg.color }} />
            <div className="px-6 py-6">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    color: typeCfg.color,
                    background: typeCfg.bg,
                    border: `1px solid ${typeCfg.border}`,
                  }}
                >
                  {typeCfg.icon} {typeCfg.label}
                </span>
                {cancelled && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">
                    {t('cancelled')}
                  </span>
                )}
                {completed && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                    {t('completed')}
                  </span>
                )}
              </div>

              <h1 className="mt-3 text-2xl md:text-3xl font-heading font-bold text-white">
                {event.title}
              </h1>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoTile
                  icon={<Clock size={15} className="text-accent" />}
                  label={t('startsAt')}
                  value={formatDate(event.start)}
                />
                <InfoTile
                  icon={<Clock size={15} className="text-accent" />}
                  label={t('endsAt')}
                  value={formatDate(event.end)}
                />
                <InfoTile
                  icon={<MapPin size={15} className="text-accent" />}
                  label={t('location')}
                  value={event.location || '—'}
                />
                <InfoTile
                  icon={<Users size={15} className="text-accent" />}
                  label={t('participantsLabel')}
                  value={`${participants.length}${
                    typeof event.maxParticipants === 'number' &&
                    event.maxParticipants > 0
                      ? ` / ${event.maxParticipants}`
                      : ''
                  }`}
                />
              </div>

              {event.description && (
                <p className="mt-5 text-sm text-muted leading-relaxed whitespace-pre-line">
                  {event.description}
                </p>
              )}

              {!participantsLoading && participants.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs text-muted mb-2">
                    {t('participants', { count: participants.length })}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {participants.map((p) => (
                      <span
                        key={p.userId}
                        className="text-xs px-2 py-1 rounded-full bg-[rgba(38,51,86,0.4)] text-white"
                      >
                        {p.displayName}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 pt-5 border-t border-[rgba(38,51,86,0.3)]">
                {cancelled || completed ? (
                  <div className="w-full h-11 rounded-lg bg-white/5 border border-[rgba(38,51,86,0.5)] flex items-center justify-center gap-2 text-sm text-muted">
                    <AlertTriangle size={16} />
                    {cancelled
                      ? t('cancelledHint')
                      : t('completedHint')}
                  </div>
                ) : !registrationOpen ? (
                  <div className="w-full h-11 rounded-lg bg-white/5 border border-[rgba(38,51,86,0.5)] flex items-center justify-center gap-2 text-sm text-muted">
                    <X size={16} />
                    {t('registrationClosed')}
                  </div>
                ) : isParticipant ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 size={16} /> {t('confirmed')}
                    </span>
                    <button
                      type="button"
                      onClick={handleLeave}
                      disabled={joining}
                      className="h-9 px-4 rounded-lg bg-white/5 border border-[rgba(38,51,86,0.5)] text-sm text-muted hover:text-white hover:border-white/20 transition-colors disabled:opacity-50"
                    >
                      {joining ? '…' : t('leaveEvent')}
                    </button>
                  </div>
                ) : (
                  <div>
                    {!user && (
                      <p className="text-xs text-muted mb-3">
                        {t('loginHint')}
                      </p>
                    )}
                    {isFull ? (
                      <div className="w-full h-11 rounded-lg bg-white/5 border border-[rgba(38,51,86,0.5)] flex items-center justify-center gap-2 text-sm text-muted">
                        <AlertTriangle size={16} /> {t('full')}
                      </div>
                    ) : user ? (
                      <button
                        type="button"
                        onClick={handleJoin}
                        disabled={joining}
                        className="w-full h-11 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Check size={16} /> {t('confirmPresence')}
                      </button>
                    ) : (
                      <Link
                        href={`/login?next=/guilds/${params.id}/events/${params.eventId}`}
                        className="w-full h-11 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors flex items-center justify-center gap-2"
                      >
                        <LogIn size={16} /> {t('confirmPresence')}
                      </Link>
                    )}
                    {error && (
                      <p className="mt-2 text-xs text-red-400">{error}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {guildName && (
            <motion.p
              variants={fadeUp}
              className="mt-5 text-center text-xs text-muted"
            >
              {guildName} · ClanForge
            </motion.p>
          )}
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
  icon: React.ReactNode;
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