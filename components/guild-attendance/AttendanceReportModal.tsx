'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { X, FileDown, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { collection, getDocs } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/admin/firebase/client';
import { COLLECTIONS } from '@/lib/admin/firebase/collections';
import { GuildCalendarEvent } from '@/lib/calendar/types';
import { cn } from '@/lib/admin/utils/cn';

type ReportMode = 'present' | 'absent';
type ReportType = 'simple' | 'detailed';

interface AttendanceReportModalProps {
  mode: ReportMode;
  guildName: string;
  events: GuildCalendarEvent[];
  memberIds: string[];
  memberNames: Record<string, string>;
  memberMeta: Record<string, { ownerId?: string }>;
  onClose: () => void;
}

function formatDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseLocalDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatTimeShort(d: Date): string {
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function AttendanceReportModal({
  mode,
  guildName,
  events,
  memberIds,
  memberNames,
  memberMeta,
  onClose,
}: AttendanceReportModalProps) {
  const t = useTranslations('GuildPanel');

  const [startDate, setStartDate] = useState(() =>
    formatDateInput(new Date(Date.now() - 30 * 86400000)),
  );
  const [endDate, setEndDate] = useState(() => formatDateInput(new Date()));
  const [reportType, setReportType] = useState<ReportType>('simple');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isPresent = mode === 'present';

  const handleGenerate = async () => {
    setError('');
    if (!startDate || !endDate || endDate < startDate) {
      setError(t('reportPeriodInvalid'));
      return;
    }

    setBusy(true);
    try {
      const start = parseLocalDate(startDate);
      start.setHours(0, 0, 0, 0);
      const end = parseLocalDate(endDate);
      end.setHours(23, 59, 59, 999);

      const inPeriod = events
        .filter(
          (e) =>
            e.start.getTime() >= start.getTime() &&
            e.start.getTime() <= end.getTime(),
        )
        .sort((a, b) => a.start.getTime() - b.start.getTime());

      if (inPeriod.length === 0) {
        setError(t('reportNoData'));
        setBusy(false);
        return;
      }

      const db = getFirebaseDb();
      const presentByEvent: Record<string, Set<string>> = {};
      for (const ev of inPeriod) {
        const col = ev.attendanceEnabled ? 'confirmations' : 'participants';
        const snap = await getDocs(
          collection(db, COLLECTIONS.GUILD_EVENTS, ev.id, col),
        );
        presentByEvent[ev.id] = new Set(snap.docs.map((d) => d.id));
      }

      const uidNames: Record<string, string> = {};
      const memberUids = new Set<string>();
      for (const cid of memberIds) {
        const owner = memberMeta[cid]?.ownerId;
        const name = memberNames[cid];
        const key = owner ?? cid;
        memberUids.add(key);
        if (name && !uidNames[key]) uidNames[key] = name;
      }

      const presentCount: Record<string, number> = {};
      const absentCount: Record<string, number> = {};
      const presentEvents: Record<string, GuildCalendarEvent[]> = {};
      const absentEvents: Record<string, GuildCalendarEvent[]> = {};
      for (const uid of memberUids) {
        presentCount[uid] = 0;
        absentCount[uid] = 0;
        presentEvents[uid] = [];
        absentEvents[uid] = [];
      }
      for (const ev of inPeriod) {
        const present = presentByEvent[ev.id];
        for (const uid of memberUids) {
          if (present.has(uid)) {
            presentCount[uid]++;
            presentEvents[uid].push(ev);
          } else {
            absentCount[uid]++;
            absentEvents[uid].push(ev);
          }
        }
      }

      buildPdf({
        guildName,
        start,
        end,
        reportType,
        memberUids,
        uidNames,
        presentCount,
        absentCount,
        presentEvents,
        absentEvents,
        isPresent,
        t,
      });
    } catch {
      setError(t('reportGenerateError'));
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#0a1122] p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-heading font-bold text-white flex items-center gap-2">
            <FileDown size={18} className="text-accent" />
            {isPresent ? t('reportTitlePresent') : t('reportTitleAbsent')}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-[rgba(38,51,86,0.3)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-muted mb-1.5">
                {t('reportStartDate')}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-11 px-3 bg-[#070f1d] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white focus:outline-none focus:border-accent/50 transition-colors [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">
                {t('reportEndDate')}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-11 px-3 bg-[#070f1d] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white focus:outline-none focus:border-accent/50 transition-colors [color-scheme:dark]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">
              {t('reportType')}
            </label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setReportType('simple')}
                className={cn(
                  'w-full h-11 px-3 rounded-lg border text-sm text-left transition-colors',
                  reportType === 'simple'
                    ? 'border-accent/50 bg-accent/10 text-white'
                    : 'border-[rgba(38,51,86,0.5)] bg-[#070f1d] text-muted hover:text-white',
                )}
              >
                {t('reportSimple')}
              </button>
              <button
                type="button"
                onClick={() => setReportType('detailed')}
                className={cn(
                  'w-full h-11 px-3 rounded-lg border text-sm text-left transition-colors',
                  reportType === 'detailed'
                    ? 'border-accent/50 bg-accent/10 text-white'
                    : 'border-[rgba(38,51,86,0.5)] bg-[#070f1d] text-muted hover:text-white',
                )}
              >
                {t('reportDetailed')}
              </button>
            </div>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-lg border border-[rgba(38,51,86,0.5)] bg-[#070f1d] text-sm text-muted hover:text-white transition-colors"
            >
              {t('close')}
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={busy}
              className={cn(
                'flex-1 h-11 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2',
                isPresent
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-red-600 hover:bg-red-700',
              )}
            >
              {busy ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <FileDown size={14} />
              )}
              {busy ? t('reportGenerating') : t('reportGenerate')}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function buildPdf({
  guildName,
  start,
  end,
  reportType,
  memberUids,
  uidNames,
  presentCount,
  absentCount,
  presentEvents,
  absentEvents,
  isPresent,
  t,
}: {
  guildName: string;
  start: Date;
  end: Date;
  reportType: ReportType;
  memberUids: Set<string>;
  uidNames: Record<string, string>;
  presentCount: Record<string, number>;
  absentCount: Record<string, number>;
  presentEvents: Record<string, GuildCalendarEvent[]>;
  absentEvents: Record<string, GuildCalendarEvent[]>;
  isPresent: boolean;
  t: (key: string, params?: Record<string, string | number | Date>) => string;
}) {
  const doc = new jsPDF();

  const title = isPresent ? t('reportTitlePresent') : t('reportTitleAbsent');
  const countLabel = isPresent ? t('reportCountPresent') : t('reportCountAbsent');

  const sorted = [...memberUids].sort((a, b) => {
    const diff = isPresent
      ? presentCount[b] - presentCount[a]
      : absentCount[b] - absentCount[a];
    if (diff !== 0) return diff;
    return (uidNames[a] ?? a).localeCompare(uidNames[b] ?? b);
  });

  let y = 24;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, 14, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (guildName) {
    doc.text(`${t('reportGuild')}: ${guildName}`, 14, y);
    y += 5;
  }
  doc.text(
    `${t('reportPeriod')}: ${formatDateShort(start)} ${t('reportTo')} ${formatDateShort(end)}`,
    14,
    y,
  );
  y += 5;
  doc.text(
    `${t('reportType')}: ${reportType === 'simple' ? t('reportSimple') : t('reportDetailed')}`,
    14,
    y,
  );
  y += 9;

  for (const uid of sorted) {
    const name = uidNames[uid] ?? 'Player';
    const count = isPresent ? presentCount[uid] : absentCount[uid];

    if (reportType === 'simple') {
      doc.setFont('helvetica', 'normal');
      doc.text(`${sorted.indexOf(uid) + 1}. ${name} — ${count} ${countLabel}`, 14, y);
      y += 6;
    } else {
      const events = isPresent ? presentEvents[uid] : absentEvents[uid];
      doc.setFont('helvetica', 'bold');
      doc.text(
        `${sorted.indexOf(uid) + 1}. ${name} (${count} ${countLabel})`,
        14,
        y,
      );
      y += 5;
      doc.setFont('helvetica', 'normal');
      for (const ev of events) {
        const line = `${ev.title} — ${formatDateShort(ev.start)} ${formatTimeShort(ev.start)}`;
        const wrapped = doc.splitTextToSize(line, 172);
        for (const w of wrapped) {
          doc.text(`   - ${w}`, 14, y);
          y += 5;
          if (y > 285) {
            doc.addPage();
            y = 20;
          }
        }
      }
      y += 3;
    }

    if (y > 285) {
      doc.addPage();
      y = 20;
    }
  }

  doc.save(
    isPresent ? 'relatorio-presencas.pdf' : 'relatorio-faltas.pdf',
  );
}