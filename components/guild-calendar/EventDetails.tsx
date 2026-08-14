'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  X,
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Loader2,
  Trash2,
  Edit3,
  UserPlus,
  UserMinus,
  Check,
} from 'lucide-react';
import {
  GuildCalendarEvent,
  EventParticipant,
  EVENT_TYPE_CONFIG,
} from '@/lib/calendar/types';
import { useEventParticipants } from '@/lib/calendar/hooks';
import { cn } from '@/lib/admin/utils/cn';

interface EventDetailsProps {
  event: GuildCalendarEvent;
  uid: string;
  isLeader: boolean;
  onClose: () => void;
  onUpdate: (eventId: string, data: Partial<GuildCalendarEvent>) => Promise<void>;
  onDelete: (eventId: string) => Promise<void>;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function EventDetails({
  event,
  uid,
  isLeader,
  onClose,
  onUpdate,
  onDelete,
}: EventDetailsProps) {
  const t = useTranslations('GuildCalendar');
  const cfg = EVENT_TYPE_CONFIG[event.type];
  const {
    participants,
    loading: participantsLoading,
    joinEvent,
    leaveEvent,
  } = useEventParticipants(event.id);

  const [deleting, setDeleting] = useState(false);
  const [joining, setJoining] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isParticipant = participants.some((p) => p.userId === uid);
  const isFull =
    event.maxParticipants !== null &&
    participants.length >= event.maxParticipants;

  const handleJoin = async () => {
    setJoining(true);
    try {
      await joinEvent(event.id, uid, '');
    } catch {
      // ignore
    }
    setJoining(false);
  };

  const handleLeave = async () => {
    setJoining(true);
    try {
      await leaveEvent(event.id, uid);
    } catch {
      // ignore
    }
    setJoining(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(event.id);
    } catch {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md max-h-[90vh] overflow-auto rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#0a1122] p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span
              className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
              style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}
            >
              {cfg.icon}
            </span>
            <div>
              <h3 className="text-base font-heading font-bold text-white">
                {event.title}
              </h3>
              <span
                className="text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: cfg.color }}
              >
                {cfg.label}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-[rgba(38,51,86,0.3)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 mb-4">
          {event.description && (
            <p className="text-sm text-muted">{event.description}</p>
          )}

          <div className="flex items-center gap-2 text-sm text-muted">
            <CalendarDays size={14} className="text-accent" />
            {formatDate(event.start)}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted">
            <Clock size={14} className="text-accent" />
            {formatTime(event.start)} - {formatTime(event.end)}
          </div>

          {event.location && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <MapPin size={14} className="text-accent" />
              {event.location}
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-muted">
            <Users size={14} className="text-accent" />
            {event.maxParticipants
              ? `${participants.length} / ${event.maxParticipants} ${t('participants')}`
              : `${participants.length} ${t('participants')}`}
          </div>
        </div>

        {event.allowRegistration && (
          <div className="mb-4">
            {isParticipant ? (
              <button
                onClick={handleLeave}
                disabled={joining}
                className="w-full h-10 rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {joining ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <UserMinus size={14} />
                )}
                {t('leaveEvent')}
              </button>
            ) : (
              <button
                onClick={handleJoin}
                disabled={joining || isFull}
                className="w-full h-10 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {joining ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <UserPlus size={14} />
                )}
                {isFull ? t('eventFull') : t('joinEvent')}
              </button>
            )}
          </div>
        )}

        {participants.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              {t('participantsList')}
            </h4>
            <div className="space-y-1.5 max-h-40 overflow-auto">
              {participants.map((p) => (
                <div
                  key={p.userId}
                  className="flex items-center gap-2 text-sm text-white/80"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  {p.displayName || 'Player'}
                </div>
              ))}
            </div>
          </div>
        )}

        {isLeader && (
          <div className="flex gap-3 pt-2 border-t border-[rgba(38,51,86,0.3)]">
            {confirmDelete ? (
              <>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 h-10 rounded-lg border border-[rgba(38,51,86,0.5)] text-sm text-muted hover:text-white transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 h-10 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting && <Loader2 size={14} className="animate-spin" />}
                  {t('confirmDelete')}
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex-1 h-10 rounded-lg border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={14} />
                {t('deleteEvent')}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
