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
  Check,
  KeyRound,
  Copy,
  CheckCircle2,
  Timer,
} from 'lucide-react';
import {
  GuildCalendarEvent,
  EVENT_TYPE_CONFIG,
} from '@/lib/calendar/types';
import {
  useEventConfirmations,
  generateAttendanceCode,
  confirmAttendance,
} from '@/lib/calendar/hooks';
import { cn } from '@/lib/admin/utils/cn';

interface EventDetailsProps {
  event: GuildCalendarEvent;
  uid: string;
  isLeader: boolean;
  canManageEvents: boolean;
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

function callableCode(err: unknown): string | null {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = String((err as { code: string }).code);
    if (code.startsWith('functions/')) return code.slice('functions/'.length);
  }
  return null;
}

export function EventDetails({
  event,
  uid,
  isLeader,
  canManageEvents,
  onClose,
  onUpdate,
  onDelete,
}: EventDetailsProps) {
  const t = useTranslations('GuildCalendar');
  const cfg = EVENT_TYPE_CONFIG[event.type];
  const {
    confirmations,
    loading: confirmationsLoading,
  } = useEventConfirmations(event.id);

  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [now, setNow] = useState(() => Date.now());
  const [code, setCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [generating, setGenerating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [attendanceError, setAttendanceError] = useState('');
  const [copied, setCopied] = useState(false);
  const [justConfirmed, setJustConfirmed] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  // Janela de confirmação: 1 min antes do fim → 15 min após o fim
  const eventEndMs = event.end?.getTime?.() ?? event.end?.getTime?.() ?? 0;
  const attStartMs = eventEndMs > 0 ? eventEndMs - 60_000 : 0;
  const attEndMs = eventEndMs > 0 ? eventEndMs + 15 * 60_000 : 0;
  const isConfirmed = confirmations.some((c) => c.userId === uid);

  let phase: 'invalid' | 'before' | 'pre' | 'open' | 'after' = 'invalid';
  if (event.attendanceEnabled && attStartMs && attEndMs) {
    if (now < attStartMs - 60000) phase = 'before';
    else if (now < attStartMs) phase = 'pre';
    else if (now <= attEndMs) phase = 'open';
    else phase = 'after';
  }

  const handleGenerate = async () => {
    setGenerating(true);
    setAttendanceError('');
    setCopied(false);
    try {
      const res = await generateAttendanceCode(event.id);
      setCode(res.code);
      setNow(Date.now());
    } catch (err) {
      const c = callableCode(err);
      if (c === 'attendance-closed') setAttendanceError(t('attendanceClosed'));
      else if (c === 'attendance-not-open')
        setAttendanceError(t('attendanceGenerateNotOpen'));
      else setAttendanceError(t('attendanceGenerateError'));
    }
    setGenerating(false);
  };

  const handleConfirm = async () => {
    setConfirming(true);
    setAttendanceError('');
    try {
      await confirmAttendance(event.id, enteredCode);
      setEnteredCode('');
      setJustConfirmed(true);
      setNow(Date.now());
    } catch (err) {
      const c = callableCode(err);
      if (c === 'attendance-invalid-code') setAttendanceError(t('attendanceInvalidCode'));
      else if (c === 'attendance-closed') setAttendanceError(t('attendanceClosed'));
      else if (c === 'attendance-not-open') setAttendanceError(t('attendanceNotOpenText'));
      else if (c === 'attendance-already-confirmed')
        setAttendanceError(t('attendanceAlreadyConfirmed'));
      else setAttendanceError(t('attendanceConfirmError'));
    }
    setConfirming(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
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
            {confirmations.length} {t('attendanceConfirmedCount')}
          </div>
        </div>

        {event.attendanceEnabled && phase !== 'invalid' && (
          <div className="mb-4 rounded-lg border border-[rgba(38,51,86,0.5)] bg-[#070f1d] p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-white/80">
                <Timer size={14} className="text-accent" />
                {t('attendanceWindow', {
                  start: formatTime(new Date(attStartMs)),
                  end: formatTime(new Date(attEndMs)),
                })}
              </div>
              {!confirmationsLoading && (
                <span className="text-xs text-muted">
                  {confirmations.length} {t('attendanceConfirmedCount')}
                </span>
              )}
            </div>

            {isConfirmed || justConfirmed ? (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/40 px-3 py-2.5 text-sm text-emerald-300 font-medium"
              >
                <CheckCircle2 size={16} className="shrink-0" />
                {t('attendanceConfirmed')}
              </motion.div>
            ) : phase === 'before' ? (
              <p className="text-xs text-muted">
                {t('attendanceNotOpen', {
                  time: formatTime(new Date(attStartMs)),
                })}
              </p>
            ) : phase === 'pre' ? (
              canManageEvents ? (
                <div className="space-y-2">
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="w-full h-10 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {generating ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <KeyRound size={14} />
                    )}
                    {t('attendanceGenerateCode')}
                  </button>
                  {code && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted">{t('attendanceCodeHint')}</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-center text-lg font-bold tracking-widest text-accent bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg py-2">
                          {code}
                        </code>
                        <button
                          onClick={handleCopy}
                          className="h-10 px-3 rounded-lg border border-[rgba(38,51,86,0.5)] text-muted hover:text-white transition-colors flex items-center justify-center gap-1.5 text-xs"
                        >
                          <Copy size={13} />
                          {copied ? t('attendanceCodeCopied') : t('attendanceCodeCopy')}
                        </button>
                      </div>
                    </div>
                  )}
                  {attendanceError && (
                    <p className="text-red-400 text-xs">{attendanceError}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted">
                  {t('attendanceNotOpen', {
                    time: formatTime(new Date(attStartMs)),
                  })}
                </p>
              )
            ) : phase === 'open' ? (
              <div className="space-y-2">
                {code && (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-center text-base font-bold tracking-widest text-accent bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg py-1.5">
                      {code}
                    </code>
                    <button
                      onClick={handleCopy}
                      className="h-9 px-3 rounded-lg border border-[rgba(38,51,86,0.5)] text-muted hover:text-white transition-colors flex items-center justify-center gap-1.5 text-xs"
                    >
                      <Copy size={13} />
                      {copied ? t('attendanceCodeCopied') : t('attendanceCodeCopy')}
                    </button>
                  </div>
                )}
                {!code && canManageEvents && (
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="w-full h-9 rounded-lg border border-accent/40 text-accent text-xs font-medium hover:bg-accent/10 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {generating ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <KeyRound size={13} />
                    )}
                    {t('attendanceGenerateCode')}
                  </button>
                )}
                {!code && !canManageEvents && (
                  <p className="text-xs text-muted">{t('attendanceWaitCode')}</p>
                )}
                <input
                  type="text"
                  value={enteredCode}
                  onChange={(e) =>
                    setEnteredCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))
                  }
                  placeholder={t('attendanceCodePlaceholder')}
                  className="w-full h-10 px-3 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors tracking-widest uppercase"
                />
                <button
                  onClick={handleConfirm}
                  disabled={confirming || !enteredCode.trim()}
                  className="w-full h-10 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {confirming ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  {t('attendanceConfirm')}
                </button>
                {attendanceError && (
                  <p className="text-red-400 text-xs">{attendanceError}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted">{t('attendanceClosed')}</p>
            )}
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
