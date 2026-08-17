'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CalendarDays, CheckCircle2, XCircle, Loader2, FileDown } from 'lucide-react';
import {
  useGuildEvents,
  useEventConfirmations,
  useEventParticipants,
} from '@/lib/calendar/hooks';
import { GuildCalendarEvent, EVENT_TYPE_CONFIG } from '@/lib/calendar/types';
import { cn } from '@/lib/admin/utils/cn';
import { AttendanceReportModal } from './AttendanceReportModal';

interface AttendanceViewProps {
  guildId: string;
  guildName: string;
  memberIds: string[];
  memberNames: Record<string, string>;
  memberMeta: Record<string, { ownerId?: string }>;
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

function PresentCard({
  event,
  confirmedUids,
  memberIds,
  memberNames,
  memberMeta,
  uidToName,
}: {
  event: GuildCalendarEvent;
  confirmedUids: string[];
  memberIds: string[];
  memberNames: Record<string, string>;
  memberMeta: Record<string, { ownerId?: string }>;
  uidToName: Record<string, string>;
}) {
  const t = useTranslations('GuildPanel');
  const cfg = EVENT_TYPE_CONFIG[event.type];
  const attended = new Set(confirmedUids);

  const present = memberIds.filter((cid) => {
    const owner = memberMeta[cid]?.ownerId;
    return owner && attended.has(owner);
  });
  const absent = memberIds.filter((cid) => {
    const owner = memberMeta[cid]?.ownerId;
    return !owner || !attended.has(owner);
  });

  return (
    <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[rgba(19,29,48,0.4)] p-4">
      <div className="flex items-center gap-3">
        <span
          className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
          style={{
            backgroundColor: cfg.bg,
            border: `1px solid ${cfg.border}`,
          }}
        >
          {cfg.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-white font-heading font-semibold text-sm truncate">
            {event.title}
          </p>
          <p className="text-xs text-muted flex items-center gap-1">
            <CalendarDays size={11} />
            {formatDate(event.start)} • {formatTime(event.start)} -{' '}
            {formatTime(event.end)}
          </p>
        </div>
        <span
          className={cn(
            'text-[10px] px-2 py-0.5 rounded font-medium shrink-0',
            event.attendanceEnabled
              ? 'bg-accent/10 text-accent'
              : 'bg-[rgba(38,51,86,0.5)] text-muted',
          )}
        >
          {event.attendanceEnabled
            ? t('attendanceBadgeCode')
            : t('attendanceBadgeJoin')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1 mb-1.5">
            <CheckCircle2 size={12} />
            {t('attendancePresent')}{' '}
            <span className="text-muted font-normal">({present.length})</span>
          </p>
          <div className="flex flex-wrap gap-1">
            {present.length === 0 ? (
              <span className="text-xs text-muted">{t('attendanceEmpty')}</span>
            ) : (
              present.map((cid) => (
                <span
                  key={cid}
                  className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300"
                >
                  {memberNames[cid] ?? uidToName[memberMeta[cid]?.ownerId ?? ''] ?? 'Player'}
                </span>
              ))
            )}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-red-400 flex items-center gap-1 mb-1.5">
            <XCircle size={12} />
            {t('attendanceAbsent')}{' '}
            <span className="text-muted font-normal">({absent.length})</span>
          </p>
          <div className="flex flex-wrap gap-1">
            {absent.length === 0 ? (
              <span className="text-xs text-muted">{t('attendanceEmpty')}</span>
            ) : (
              absent.map((cid) => (
                <span
                  key={cid}
                  className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-300"
                >
                  {memberNames[cid] ?? 'Player'}
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AttendanceCard({
  event,
  memberIds,
  memberNames,
  memberMeta,
  uidToName,
}: {
  event: GuildCalendarEvent;
  memberIds: string[];
  memberNames: Record<string, string>;
  memberMeta: Record<string, { ownerId?: string }>;
  uidToName: Record<string, string>;
}) {
  const { confirmations, loading } = useEventConfirmations(event.id);
  if (loading) {
    return (
      <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[rgba(19,29,48,0.4)] p-6 flex items-center justify-center">
        <Loader2 size={18} className="text-accent animate-spin" />
      </div>
    );
  }
  return (
    <PresentCard
      event={event}
      confirmedUids={confirmations.map((c) => c.userId)}
      memberIds={memberIds}
      memberNames={memberNames}
      memberMeta={memberMeta}
      uidToName={uidToName}
    />
  );
}

function ParticipationCard({
  event,
  memberIds,
  memberNames,
  memberMeta,
  uidToName,
}: {
  event: GuildCalendarEvent;
  memberIds: string[];
  memberNames: Record<string, string>;
  memberMeta: Record<string, { ownerId?: string }>;
  uidToName: Record<string, string>;
}) {
  const { participants, loading } = useEventParticipants(event.id);
  if (loading) {
    return (
      <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[rgba(19,29,48,0.4)] p-6 flex items-center justify-center">
        <Loader2 size={18} className="text-accent animate-spin" />
      </div>
    );
  }
  return (
    <PresentCard
      event={event}
      confirmedUids={participants.map((p) => p.userId)}
      memberIds={memberIds}
      memberNames={memberNames}
      memberMeta={memberMeta}
      uidToName={uidToName}
    />
  );
}

export function AttendanceView({
  guildId,
  guildName,
  memberIds,
  memberNames,
  memberMeta,
}: AttendanceViewProps) {
  const t = useTranslations('GuildPanel');
  const { events, loading, error } = useGuildEvents(guildId);
  const [reportMode, setReportMode] = useState<'present' | 'absent' | null>(
    null,
  );

  const sorted = useMemo(
    () =>
      [...events].sort(
        (a, b) =>
          b.start.getTime() - a.start.getTime() || a.id.localeCompare(b.id),
      ),
    [events],
  );

  const uidToName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const cid of memberIds) {
      const owner = memberMeta[cid]?.ownerId;
      const name = memberNames[cid];
      if (owner && name && !map[owner]) map[owner] = name;
    }
    return map;
  }, [memberIds, memberMeta, memberNames]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 size={28} className="text-accent animate-spin" />
      </div>
    );
  }

  if (error) {
    return <p className="text-red-400 text-sm">{error}</p>;
  }

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[rgba(19,29,48,0.4)] p-8 text-center text-muted text-sm">
        {t('attendanceNoEvents')}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setReportMode('present')}
          className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <FileDown size={15} />
          {t('attendanceReportPresent')}
        </button>
        <button
          onClick={() => setReportMode('absent')}
          className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
        >
          <FileDown size={15} />
          {t('attendanceReportAbsent')}
        </button>
      </div>

      <div className="space-y-3">
        {sorted.map((event) =>
          event.attendanceEnabled ? (
            <AttendanceCard
              key={event.id}
              event={event}
              memberIds={memberIds}
              memberNames={memberNames}
              memberMeta={memberMeta}
              uidToName={uidToName}
            />
          ) : (
            <ParticipationCard
              key={event.id}
              event={event}
              memberIds={memberIds}
              memberNames={memberNames}
              memberMeta={memberMeta}
              uidToName={uidToName}
            />
          ),
        )}
      </div>

      {reportMode && (
        <AttendanceReportModal
          mode={reportMode}
          guildName={guildName}
          events={events}
          memberIds={memberIds}
          memberNames={memberNames}
          memberMeta={memberMeta}
          onClose={() => setReportMode(null)}
        />
      )}
    </>
  );
}