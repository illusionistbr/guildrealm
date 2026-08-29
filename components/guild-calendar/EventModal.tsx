'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { X, CalendarDays, Loader2 } from 'lucide-react';
import { EventType, EVENT_TYPES, EVENT_TYPE_CONFIG, GuildCalendarEvent } from '@/lib/calendar/types';
import { cn } from '@/lib/admin/utils/cn';

interface EventModalProps {
  guildId: string;
  uid: string;
  displayName: string;
  initialStart: Date | null;
  initialEnd: Date | null;
  onClose: () => void;
  onSubmit: (data: Omit<GuildCalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

function formatDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTimeLocal(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function EventModal({
  guildId,
  uid,
  displayName,
  initialStart,
  initialEnd,
  onClose,
  onSubmit,
}: EventModalProps) {
  const t = useTranslations('GuildCalendar');

  const now = initialStart ?? new Date();
  const endDefault = initialEnd ?? new Date(now.getTime() + 3600000);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EventType>(EVENT_TYPES.RAID);
  const [date, setDate] = useState(formatDateLocal(now));
  const [startTime, setStartTime] = useState(formatTimeLocal(now));
  const [endTime, setEndTime] = useState(formatTimeLocal(endDefault));
  const [location, setLocation] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [attendanceEnabled, setAttendanceEnabled] = useState(false);
  const [dkpReward, setDkpReward] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = title.trim();
    if (!trimmed) {
      setError(t('titleRequired'));
      return;
    }

    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);

    const [y, mo, d] = date.split('-').map(Number);
    const start = new Date(y, mo - 1, d, sh, sm, 0);
    const end = new Date(y, mo - 1, d, eh, em, 0);

    if (end <= start) {
      setError(t('invalidTime'));
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        guildId,
        title: trimmed,
        description: description.trim(),
        type,
        start,
        end,
        location: location.trim(),
        maxParticipants: maxParticipants ? Number(maxParticipants) : null,
        allowRegistration,
        status: 'active',
        createdBy: uid,
        createdByName: displayName,
        attendanceEnabled,
        dkpReward: dkpReward ? Number(dkpReward) : 0,
      } as any);
    } catch {
      setError(t('createError'));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg max-h-[90vh] overflow-auto rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#0a1122] p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-heading font-bold text-white flex items-center gap-2">
            <CalendarDays size={18} className="text-accent" />
            {t('newEvent')}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-[rgba(38,51,86,0.3)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1.5">
              {t('title')}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('titlePlaceholder')}
              maxLength={60}
              className="w-full h-11 px-3 bg-[#070f1d] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">
              {t('description')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 bg-[#070f1d] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">
              {t('eventType')}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.entries(EVENT_TYPE_CONFIG) as [EventType, typeof EVENT_TYPE_CONFIG[EventType]][]).map(
                ([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setType(key)}
                    className={cn(
                      'h-9 flex items-center justify-center gap-1.5 rounded-lg border text-xs font-medium transition-all',
                      type === key
                        ? 'shadow-[0_0_0_1px_var(--tw-shadow-color)]'
                        : 'border-[rgba(38,51,86,0.5)] bg-[#070f1d] text-muted hover:text-white',
                    )}
                    style={
                      type === key
                        ? {
                            backgroundColor: cfg.bg,
                            borderColor: cfg.border,
                            color: cfg.color,
                          }
                        : undefined
                    }
                  >
                    <span>{cfg.icon}</span>
                    <span className="hidden sm:inline">{cfg.label}</span>
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-muted mb-1.5">
                {t('date')}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-11 px-3 bg-[#070f1d] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white focus:outline-none focus:border-accent/50 transition-colors [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">
                {t('startTime')}
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full h-11 px-3 bg-[#070f1d] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white focus:outline-none focus:border-accent/50 transition-colors [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">
                {t('endTime')}
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full h-11 px-3 bg-[#070f1d] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white focus:outline-none focus:border-accent/50 transition-colors [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-muted mb-1.5">
                {t('location')}
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t('locationPlaceholder')}
                maxLength={100}
                className="w-full h-11 px-3 bg-[#070f1d] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">
                {t('maxParticipants')}
              </label>
              <input
                type="number"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
                placeholder={t('unlimited')}
                min="1"
                className="w-full h-11 px-3 bg-[#070f1d] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allowRegistration}
              onChange={(e) => setAllowRegistration(e.target.checked)}
              className="w-4 h-4 rounded border-[rgba(38,51,86,0.5)] bg-[#070f1d] accent-accent"
            />
            <span className="text-sm text-muted">{t('allowRegistration')}</span>
          </label>

          <div className="rounded-lg border border-[rgba(38,51,86,0.5)] bg-[#070f1d] p-3 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={attendanceEnabled}
                onChange={(e) => setAttendanceEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-[rgba(38,51,86,0.5)] bg-[#070f1d] accent-accent"
              />
              <span className="text-sm text-muted">{t('attendanceEnabled')}</span>
            </label>

            {attendanceEnabled && (
              <p className="text-xs text-muted/80 leading-relaxed">
                {t('attendanceEnabledHint')}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-accent/20 bg-accent/5 p-3 space-y-2">
            <label className="block text-sm font-medium text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-accent/20 flex items-center justify-center text-accent text-xs">💎</span>
              Recompensa DKP
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={dkpReward}
                onChange={(e) => setDkpReward(e.target.value)}
                placeholder="0"
                min="0"
                max="10000"
                className="flex-1 h-10 px-3 bg-[#070f1d] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
              />
              <span className="text-sm text-accent font-bold">DKP</span>
            </div>
            <p className="text-[11px] text-muted">DKP por participação. Deixe 0 para sem recompensa. Pago automaticamente ao confirmar presença.</p>
          </div>

          {error && (
            <p className="text-red-400 text-xs">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-lg border border-[rgba(38,51,86,0.5)] bg-[#070f1d] text-sm text-muted hover:text-white transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-11 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {t('create')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
